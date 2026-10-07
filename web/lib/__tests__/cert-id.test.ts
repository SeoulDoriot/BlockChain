import { describe, expect, it } from "vitest";
import { extractCertificateId, parseIdPrefix, prefixRange, safeDecode } from "@/lib/cert-id";

const ID = "52da8442-d493-48c8-b9b1-eac60e31659e";

describe("extractCertificateId", () => {
  it("returns a bare id unchanged", () => {
    expect(extractCertificateId(ID)).toBe(ID);
  });

  it("finds the id inside a pasted verify link, even percent-encoded", () => {
    expect(extractCertificateId(`http://localhost:3002/verify/${ID}`)).toBe(ID);
    expect(extractCertificateId(encodeURIComponent(`https://x.test/verify/${ID}?t=1`))).toBe(ID);
  });

  it("lower-cases and ignores surrounding whitespace", () => {
    expect(extractCertificateId(`  ${ID.toUpperCase()}\n`)).toBe(ID);
  });

  it("returns null when there is no full id", () => {
    expect(extractCertificateId("52da8442")).toBeNull();
    expect(extractCertificateId("not-an-id")).toBeNull();
  });
});

describe("parseIdPrefix", () => {
  it("accepts the short form shown in the table", () => {
    expect(parseIdPrefix("52da8442")).toBe("52da8442");
    expect(parseIdPrefix(" 52DA8442 ")).toBe("52da8442");
    expect(parseIdPrefix("52da8442-d493")).toBe("52da8442d493");
  });

  it("rejects things that are too short or not hex", () => {
    expect(parseIdPrefix("52da8")).toBeNull();
    expect(parseIdPrefix("hello-world")).toBeNull();
    expect(parseIdPrefix(ID.replace(/-/g, ""))).toBeNull(); // 32 chars is a full id
  });
});

describe("prefixRange", () => {
  it("brackets every id that starts with the prefix", () => {
    const { low, high } = prefixRange("52da8442");
    expect(low).toBe("52da8442-0000-0000-0000-000000000000");
    expect(high).toBe("52da8442-ffff-ffff-ffff-ffffffffffff");
    expect(ID >= low && ID <= high).toBe(true);
  });

  it("works for a prefix that ends mid-group", () => {
    const { low, high } = prefixRange("52da8442d4");
    expect(low).toBe("52da8442-d400-0000-0000-000000000000");
    expect(high).toBe("52da8442-d4ff-ffff-ffff-ffffffffffff");
  });
});

describe("safeDecode", () => {
  it("does not throw on malformed percent-encoding", () => {
    expect(safeDecode("100%")).toBe("100%");
  });
});
