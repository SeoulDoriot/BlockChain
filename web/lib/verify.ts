import "server-only";

import { cacheTag, cacheLife } from "next/cache";
import type { Hex } from "viem";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrgById } from "@/lib/data/reference";
import { getCertificate, type OnChainRecord } from "@/lib/chain/registry";
import { deriveStatus, type DisplayStatus } from "@/lib/status";
import { hashCertificate } from "@/lib/cert/hash";
import type { PublicCertificate } from "@/lib/data/certificates";

export interface VerificationResult {
  found: boolean;
  status: DisplayStatus;
  certificate: PublicCertificate | null;
  orgName: string | null;
  chain: OnChainRecord | null;
  /**
   * True when the hash recomputed from the stored row does not match the hash
   * anchored on-chain — i.e. the database row was edited after issuing.
   */
  tampered: boolean;
  /** The hash recomputed from the row, shown next to the anchored one. */
  computedHash: string | null;
}

/**
 * Row shape used internally. Includes the recipient's email and the org slug
 * because both are part of the canonical payload (CLAUDE.md §3) and so are
 * needed to recompute the hash. Neither is returned to the browser.
 */
interface InternalRow extends PublicCertificate {
  recipient_email: string;
}

/**
 * Verify a certificate by id.
 *
 * Three independent facts are gathered and then reconciled:
 *   1. the database row,
 *   2. the org (for the slug, which the hash covers),
 *   3. the on-chain record.
 *
 * Steps 2 and 3 are independent of each other and run in parallel; the chain
 * read is one getCertificate call, batched into a single JSON-RPC request.
 *
 * Tamper detection is the point of the whole system: the hash is recomputed
 * from the row as it stands now and compared to what was anchored. If someone
 * edits the database directly — the exact attack a blockchain anchor exists to
 * catch — the two no longer match and the result is TAMPERED regardless of
 * what the chain says about validity.
 */
export async function verifyCertificateById(
  id: string,
): Promise<VerificationResult> {
  "use cache";
  cacheTag(`certificate:${id}`);
  cacheLife("verification");

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("certificates")
    .select(
      `id, org_id, recipient_name, recipient_email, issued_on, expires_on,
       cert_hash, tx_hash, chain_id, status, revoked_reason,
       course:courses!certificates_course_id_fkey ( code, title )`,
    )
    .eq("id", id)
    .maybeSingle();

  const row = data as unknown as InternalRow | null;

  if (!row) {
    return {
      found: false,
      status: "not_found",
      certificate: null,
      orgName: null,
      chain: null,
      tampered: false,
      computedHash: null,
    };
  }

  const [org, chain] = await Promise.all([
    getOrgById(row.org_id),
    row.cert_hash
      ? getCertificate(row.cert_hash as Hex)
      : Promise.resolve(null),
  ]);

  // Recompute the hash from the row exactly as it stands now.
  let computedHash: string | null = null;
  let tampered = false;

  if (row.cert_hash && org && row.course) {
    try {
      computedHash = hashCertificate({
        id: row.id,
        orgSlug: org.slug,
        courseCode: row.course.code,
        recipientName: row.recipient_name,
        recipientEmail: row.recipient_email,
        issuedOn: row.issued_on,
        expiresOn: row.expires_on,
      });
      tampered = computedHash.toLowerCase() !== row.cert_hash.toLowerCase();
    } catch {
      // A row that can no longer produce a canonical payload (an empty name,
      // a pipe injected into a field) is itself evidence of tampering.
      tampered = true;
    }
  }

  const derived = deriveStatus({
    chainStatus: chain?.status ?? null,
    rowStatus: row.status,
    expiresOn: row.expires_on,
  });

  // Tampering outranks everything except an outright missing record: a
  // certificate whose details no longer match its anchor must never read
  // "Valid", however healthy the chain says the hash is.
  const status: DisplayStatus =
    tampered && derived !== "not_found" ? "tampered" : derived;

  // Strip the email before handing anything back to a caller that renders.
  const publicCertificate: PublicCertificate = {
    id: row.id,
    org_id: row.org_id,
    recipient_name: row.recipient_name,
    issued_on: row.issued_on,
    expires_on: row.expires_on,
    cert_hash: row.cert_hash,
    tx_hash: row.tx_hash,
    chain_id: row.chain_id,
    status: row.status,
    revoked_reason: row.revoked_reason,
    course: row.course,
  };

  return {
    found: true,
    status,
    certificate: publicCertificate,
    orgName: org?.name ?? null,
    chain,
    tampered,
    computedHash,
  };
}
