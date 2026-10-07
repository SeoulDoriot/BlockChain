/**
 * Turning whatever someone pasted into a certificate id.
 *
 * People copy from many places: the bare id, the whole verify link, an id with
 * stray spaces or capitals, or the short 8-character form the staff table
 * shows. Pure functions, no server imports, so they are easy to test.
 */

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/** A route param can arrive percent-encoded; decode without ever throwing. */
export function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** A full certificate id found anywhere in the input (bare id, or inside a link). */
export function extractCertificateId(raw: string): string | null {
  const match = safeDecode(raw).match(UUID);
  return match ? match[0].toLowerCase() : null;
}

/**
 * The leading part of an id, as hex digits only (6–31 of them). This is the
 * short form shown in staff tables; it is only ever resolved for signed-in staff.
 */
export function parseIdPrefix(raw: string): string | null {
  const value = safeDecode(raw).trim().toLowerCase().replace(/-/g, "");
  return /^[0-9a-f]{6,31}$/.test(value) ? value : null;
}

function asUuid(hex: string): string {
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** The lowest and highest ids that start with `prefix`, for a range query. */
export function prefixRange(prefix: string): { low: string; high: string } {
  return {
    low: asUuid(prefix.padEnd(32, "0")),
    high: asUuid(prefix.padEnd(32, "f")),
  };
}
