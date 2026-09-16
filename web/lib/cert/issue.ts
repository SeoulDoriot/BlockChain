import "server-only";

import { createHash } from "node:crypto";
import { revalidateTag } from "next/cache";
import type { Hex } from "viem";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashCertificate } from "@/lib/cert/hash";
import { renderCertificatePdf } from "@/lib/cert/pdf";
import { pdfPath, uploadPdf } from "@/lib/cert/storage";
import { issueOnChain, revokeOnChain } from "@/lib/chain/registry";
import { recordAudit } from "@/lib/audit";
import { env } from "@/lib/env";

/**
 * The issuing pipeline.
 *
 * Order matters and is deliberate:
 *   1. hash      — cheap, and a failure here must happen before anything else
 *   2. chain     — the irreversible step; everything after it is recoverable
 *   3. PDF       — needs the tx hash to print on the document
 *   4. upload    — private bucket
 *   5. row update — records the anchor so the certificate becomes verifiable
 *
 * Email is NOT part of this. It is sent by the caller via `after()` so the
 * user's response returns as soon as the certificate exists.
 */

export interface IssueInput {
  certificateId: string;
  orgId: string;
  orgSlug: string;
  orgName: string;
  courseCode: string;
  courseTitle: string;
  recipientName: string;
  recipientEmail: string;
  issuedOn: string;
  expiresOn: string | null;
  actorStaffId: string | null;
}

export interface IssueOutput {
  certHash: Hex;
  txHash: string;
  pdfStoragePath: string;
  pdf: Uint8Array;
}

export async function issueCertificate(
  input: IssueInput,
): Promise<IssueOutput> {
  const supabase = createAdminClient();

  // 1. canonical hash
  const certHash = hashCertificate({
    id: input.certificateId,
    orgSlug: input.orgSlug,
    courseCode: input.courseCode,
    recipientName: input.recipientName,
    recipientEmail: input.recipientEmail,
    issuedOn: input.issuedOn,
    expiresOn: input.expiresOn,
  });

  // 2. anchor on-chain and wait for the receipt
  const receipt = await issueOnChain(certHash, input.expiresOn);

  // 3. render the PDF (now that the tx hash exists to print on it)
  const pdf = await renderCertificatePdf({
    certificateId: input.certificateId,
    orgName: input.orgName,
    recipientName: input.recipientName,
    courseCode: input.courseCode,
    courseTitle: input.courseTitle,
    issuedOn: input.issuedOn,
    expiresOn: input.expiresOn,
    certHash,
    txHash: receipt.txHash,
  });

  // 4. store it privately, and fingerprint the exact bytes we generated so
  //    an uploaded copy can be checked for tampering later
  const storagePath = pdfPath(input.orgId, input.certificateId);
  await uploadPdf(storagePath, pdf);
  const pdfSha256 = createHash("sha256").update(pdf).digest("hex");

  // 5. record the anchor
  const { error } = await supabase
    .from("certificates")
    .update({
      cert_hash: certHash,
      tx_hash: receipt.txHash,
      chain_id: env.NEXT_PUBLIC_CHAIN_ID,
      pdf_path: storagePath,
      pdf_sha256: pdfSha256,
      status: "issued",
    })
    .eq("id", input.certificateId);

  if (error) {
    throw new Error(
      `Certificate was anchored on-chain (tx ${receipt.txHash}) but the ` +
        `database update failed: ${error.message}. Use "retry" to reconcile.`,
    );
  }

  await recordAudit({
    orgId: input.orgId,
    actor: input.actorStaffId,
    action: "certificate.issued",
    entity: "certificate",
    entityId: input.certificateId,
    meta: {
      certHash,
      txHash: receipt.txHash,
      blockNumber: receipt.blockNumber.toString(),
      gasUsed: receipt.gasUsed.toString(),
    },
  });

  // expire: 0 — never serve a stale verification result for a certificate
  // whose state just changed.
  revalidateTag(`certificate:${input.certificateId}`, { expire: 0 });

  return {
    certHash,
    txHash: receipt.txHash,
    pdfStoragePath: storagePath,
    pdf,
  };
}

export async function revokeCertificate(input: {
  certificateId: string;
  orgId: string;
  certHash: Hex;
  reason: string;
  actorStaffId: string | null;
}): Promise<{ txHash: string }> {
  const receipt = await revokeOnChain(input.certHash, input.reason);

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("certificates")
    .update({ status: "revoked", revoked_reason: input.reason })
    .eq("id", input.certificateId);

  if (error) throw new Error(error.message);

  await recordAudit({
    orgId: input.orgId,
    actor: input.actorStaffId,
    action: "certificate.revoked",
    entity: "certificate",
    entityId: input.certificateId,
    meta: { reason: input.reason, txHash: receipt.txHash },
  });

  // A revoked certificate must stop reading "Valid" immediately, not in 60s.
  revalidateTag(`certificate:${input.certificateId}`, { expire: 0 });

  return { txHash: receipt.txHash };
}
