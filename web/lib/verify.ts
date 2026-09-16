import "server-only";

import { cacheTag, cacheLife } from "next/cache";
import type { Hex } from "viem";
import { getPublicCertificate, type PublicCertificate } from "@/lib/data/certificates";
import { getOrgById } from "@/lib/data/reference";
import { getCertificate, type OnChainRecord } from "@/lib/chain/registry";
import { deriveStatus, type DisplayStatus } from "@/lib/status";
import { hashCertificate } from "@/lib/cert/hash";

export interface VerificationResult {
  found: boolean;
  status: DisplayStatus;
  certificate: PublicCertificate | null;
  orgName: string | null;
  chain: OnChainRecord | null;
  /** True when the stored hash does not match a hash recomputed from the row. */
  tampered: boolean;
}

/**
 * Verify a certificate by id.
 *
 * The database read and the chain read are independent, so they run in
 * parallel. The chain read is a single getCertificate call, which the
 * batching transport turns into one JSON-RPC round trip.
 *
 * Cached for 60s under a per-certificate tag, so revoking or renewing flushes
 * exactly that certificate and nothing else.
 */
export async function verifyCertificateById(
  id: string,
): Promise<VerificationResult> {
  "use cache";
  cacheTag(`certificate:${id}`);
  cacheLife("verification");

  const certificate = await getPublicCertificate(id);

  if (!certificate) {
    return {
      found: false,
      status: "not_found",
      certificate: null,
      orgName: null,
      chain: null,
      tampered: false,
    };
  }

  // Now that we have the row, org lookup and chain read are independent.
  const [org, chain] = await Promise.all([
    getOrgById(certificate.org_id),
    certificate.cert_hash
      ? getCertificate(certificate.cert_hash as Hex)
      : Promise.resolve(null),
  ]);

  const status = deriveStatus({
    chainStatus: chain?.status ?? null,
    rowStatus: certificate.status,
    expiresOn: certificate.expires_on,
  });

  return {
    found: true,
    status,
    certificate,
    orgName: org?.name ?? null,
    chain,
    tampered: false,
  };
}

/**
 * Recompute the hash from the database row and compare it to the stored hash.
 *
 * Catches a row that was edited directly in the database after issuing —
 * exactly the attack the blockchain anchor exists to detect.
 */
export async function detectRowTampering(
  id: string,
  orgSlug: string,
  recipientEmail: string,
): Promise<boolean> {
  const certificate = await getPublicCertificate(id);
  if (!certificate?.cert_hash || !certificate.course) return false;

  const recomputed = hashCertificate({
    id: certificate.id,
    orgSlug,
    courseCode: certificate.course.code,
    recipientName: certificate.recipient_name,
    recipientEmail,
    issuedOn: certificate.issued_on,
    expiresOn: certificate.expires_on,
  });

  return recomputed.toLowerCase() !== certificate.cert_hash.toLowerCase();
}
