import { keccak256, toBytes, type Hex } from "viem";

/**
 * Canonical certificate payload and hashing — CLAUDE.md §3.
 *
 * The issuer and the verifier must independently derive a byte-identical
 * string, or verification fails for a genuine certificate. Every
 * normalisation rule below exists for that reason, so none of them may be
 * changed without bumping the version prefix to v2.
 */

export const PAYLOAD_VERSION = "v1";

export interface CertificateFields {
  /** UUID of the Supabase row. */
  id: string;
  /** Organisation slug, e.g. "kit". */
  orgSlug: string;
  /** Course code, e.g. "CS101". */
  courseCode: string;
  recipientName: string;
  recipientEmail: string;
  /** YYYY-MM-DD */
  issuedOn: string;
  /** YYYY-MM-DD, or null when the certificate never expires. */
  expiresOn: string | null;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Trim, collapse internal whitespace to single spaces, and normalise to
 * Unicode NFC. Case is preserved — "Sok Dara" and "SOK DARA" are different
 * people as far as the hash is concerned, which is intentional: the name on
 * the certificate is the name that is hashed.
 *
 * NFC matters for Khmer and any accented Latin text: the same visible string
 * can be encoded two different ways, and without normalisation those produce
 * different hashes.
 */
export function normalizeName(value: string): string {
  return value.trim().replace(/\s+/gu, " ").normalize("NFC");
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase().normalize("NFC");
}

/** Build the exact string that gets hashed. */
export function buildCanonicalPayload(fields: CertificateFields): string {
  const id = fields.id.trim().toLowerCase();
  const orgSlug = fields.orgSlug.trim().toLowerCase();
  const courseCode = fields.courseCode.trim().toUpperCase();
  const recipientName = normalizeName(fields.recipientName);
  const recipientEmail = normalizeEmail(fields.recipientEmail);
  const issuedOn = fields.issuedOn.trim();
  const expiresOn = fields.expiresOn?.trim() ?? "";

  if (!id) throw new Error("Certificate id is required.");
  if (!orgSlug) throw new Error("Organisation slug is required.");
  if (!courseCode) throw new Error("Course code is required.");
  if (!recipientName) throw new Error("Recipient name is required.");
  if (!recipientEmail) throw new Error("Recipient email is required.");
  if (!DATE_RE.test(issuedOn)) {
    throw new Error(`issuedOn must be YYYY-MM-DD, got "${issuedOn}".`);
  }
  if (expiresOn !== "" && !DATE_RE.test(expiresOn)) {
    throw new Error(`expiresOn must be YYYY-MM-DD or null, got "${expiresOn}".`);
  }

  // A separator inside a field would let two different certificates produce
  // the same payload. Reject rather than silently escape.
  const parts = [
    PAYLOAD_VERSION,
    id,
    orgSlug,
    courseCode,
    recipientName,
    recipientEmail,
    issuedOn,
    expiresOn,
  ];

  for (const part of parts) {
    if (part.includes("|")) {
      throw new Error("Certificate fields must not contain the '|' character.");
    }
  }

  return parts.join("|");
}

/** keccak256 of the canonical payload, as a 0x-prefixed bytes32. */
export function hashCertificate(fields: CertificateFields): Hex {
  return keccak256(toBytes(buildCanonicalPayload(fields)));
}
