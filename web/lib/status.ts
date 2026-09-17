/**
 * The single place certificate status is decided — CLAUDE.md §8.
 *
 * The chain is authoritative. The database row is a cache, and where the two
 * disagree the chain wins. "expired" is never stored anywhere; it is derived
 * here and in the contract, from a date comparison.
 */

/** Mirrors the Status enum in CertificateRegistry.sol. */
export const ChainStatus = {
  Unknown: 0,
  Active: 1,
  Expired: 2,
  Revoked: 3,
} as const;

export type ChainStatus = (typeof ChainStatus)[keyof typeof ChainStatus];

export type DisplayStatus =
  | "active"
  | "expired"
  | "revoked"
  | "tampered"
  | "not_found"
  | "draft";

export interface DeriveStatusInput {
  /** Status read from the contract, or null when the row was never anchored. */
  chainStatus: ChainStatus | null;
  /** Row status from the database. */
  rowStatus: "draft" | "issued" | "revoked";
  /** YYYY-MM-DD, or null for no expiry. */
  expiresOn: string | null;
  /** Injectable for testing. Defaults to now. */
  now?: Date;
}

/** True when expiresOn is today or earlier, matching the contract's `>=`. */
export function isExpired(expiresOn: string | null, now: Date = new Date()): boolean {
  if (!expiresOn) return false;

  const expiry = Date.parse(`${expiresOn}T00:00:00Z`);
  if (Number.isNaN(expiry)) return false;

  return now.getTime() >= expiry;
}

export function deriveStatus({
  chainStatus,
  rowStatus,
  expiresOn,
  now = new Date(),
}: DeriveStatusInput): DisplayStatus {
  // A draft has never been anchored, so there is nothing to verify yet.
  if (rowStatus === "draft") return "draft";

  // The chain is authoritative wherever it has an opinion.
  if (chainStatus === ChainStatus.Revoked) return "revoked";
  if (chainStatus === ChainStatus.Expired) return "expired";
  if (chainStatus === ChainStatus.Unknown) return "not_found";

  if (chainStatus === ChainStatus.Active) {
    // Defensive: the contract and the row should already agree. If the row
    // says expired and the chain has not caught up (clock skew, or an expiry
    // the contract was never told about), prefer the stricter answer.
    return isExpired(expiresOn, now) ? "expired" : "active";
  }

  // chainStatus === null: the row claims to be issued but we could not read
  // the chain. Never report "active" on the strength of the database alone.
  if (rowStatus === "revoked") return "revoked";
  return isExpired(expiresOn, now) ? "expired" : "not_found";
}

export const STATUS_LABELS: Record<DisplayStatus, string> = {
  tampered: "Tampered",
  active: "Valid",
  expired: "Expired",
  revoked: "Revoked",
  not_found: "Not found",
  draft: "Draft",
};
