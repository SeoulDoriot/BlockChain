import { describe, it, expect } from "vitest";
import { ChainStatus, deriveStatus, isExpired } from "@/lib/status";

const NOW = new Date("2026-06-15T12:00:00Z");

describe("isExpired", () => {
  it("is false when there is no expiry", () => {
    expect(isExpired(null, NOW)).toBe(false);
  });

  it("is false for a future date", () => {
    expect(isExpired("2030-01-01", NOW)).toBe(false);
  });

  it("is true for a past date", () => {
    expect(isExpired("2020-01-01", NOW)).toBe(true);
  });

  it("is true on the expiry day itself, matching the contract's >=", () => {
    expect(isExpired("2026-06-15", NOW)).toBe(true);
  });

  it("is false on the day before", () => {
    expect(isExpired("2026-06-16", NOW)).toBe(false);
  });

  it("is false for an unparseable date rather than throwing", () => {
    expect(isExpired("not-a-date", NOW)).toBe(false);
  });
});

describe("deriveStatus", () => {
  it("reports draft before anything is anchored", () => {
    expect(
      deriveStatus({
        chainStatus: null,
        rowStatus: "draft",
        expiresOn: null,
        now: NOW,
      }),
    ).toBe("draft");
  });

  it("reports active when the chain says active", () => {
    expect(
      deriveStatus({
        chainStatus: ChainStatus.Active,
        rowStatus: "issued",
        expiresOn: "2030-01-01",
        now: NOW,
      }),
    ).toBe("active");
  });

  it("reports revoked when the chain says revoked, even if the row says issued", () => {
    expect(
      deriveStatus({
        chainStatus: ChainStatus.Revoked,
        rowStatus: "issued",
        expiresOn: null,
        now: NOW,
      }),
    ).toBe("revoked");
  });

  it("reports expired when the chain says expired", () => {
    expect(
      deriveStatus({
        chainStatus: ChainStatus.Expired,
        rowStatus: "issued",
        expiresOn: "2020-01-01",
        now: NOW,
      }),
    ).toBe("expired");
  });

  it("reports not_found when the chain has never seen the hash", () => {
    expect(
      deriveStatus({
        chainStatus: ChainStatus.Unknown,
        rowStatus: "issued",
        expiresOn: null,
        now: NOW,
      }),
    ).toBe("not_found");
  });

  it("prefers the stricter answer when the chain says active but the row has expired", () => {
    expect(
      deriveStatus({
        chainStatus: ChainStatus.Active,
        rowStatus: "issued",
        expiresOn: "2020-01-01",
        now: NOW,
      }),
    ).toBe("expired");
  });

  it("never reports active on the strength of the database alone", () => {
    expect(
      deriveStatus({
        chainStatus: null,
        rowStatus: "issued",
        expiresOn: "2030-01-01",
        now: NOW,
      }),
    ).toBe("not_found");
  });

  it("still reports revoked when the chain is unreachable but the row says revoked", () => {
    expect(
      deriveStatus({
        chainStatus: null,
        rowStatus: "revoked",
        expiresOn: null,
        now: NOW,
      }),
    ).toBe("revoked");
  });

  it("reports expired when the chain is unreachable and the row has expired", () => {
    expect(
      deriveStatus({
        chainStatus: null,
        rowStatus: "issued",
        expiresOn: "2020-01-01",
        now: NOW,
      }),
    ).toBe("expired");
  });
});

// --- QR payload parsing -----------------------------------------------------

import { extractCertificateId } from "@/components/scan-launcher";

describe("extractCertificateId", () => {
  const id = "3f1a7b2c-8d4e-4f60-9a1b-2c3d4e5f6071";

  it("pulls the id out of a full verify URL", () => {
    expect(extractCertificateId(`https://example.com/verify/${id}`)).toBe(id);
  });

  it("handles a URL with a query string", () => {
    expect(extractCertificateId(`https://example.com/verify/${id}?src=qr`)).toBe(id);
  });

  it("accepts a bare id", () => {
    expect(extractCertificateId(id)).toBe(id);
  });

  it("trims surrounding whitespace", () => {
    expect(extractCertificateId(`  ${id}  `)).toBe(id);
  });

  it("rejects an unrelated URL", () => {
    expect(extractCertificateId("https://example.com/about")).toBeNull();
  });

  it("rejects arbitrary text", () => {
    expect(extractCertificateId("hello world")).toBeNull();
  });

  it("rejects an empty string", () => {
    expect(extractCertificateId("   ")).toBeNull();
  });
});
