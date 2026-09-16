import { describe, it, expect } from "vitest";
import {
  buildCanonicalPayload,
  hashCertificate,
  normalizeEmail,
  normalizeName,
  type CertificateFields,
} from "@/lib/cert/hash";

const base: CertificateFields = {
  id: "3f1a7b2c-8d4e-4f60-9a1b-2c3d4e5f6071",
  orgSlug: "kit",
  courseCode: "CS101",
  recipientName: "Sok Dara",
  recipientEmail: "sok.dara@kit.edu.kh",
  issuedOn: "2026-06-15",
  expiresOn: null,
};

describe("normalizeName", () => {
  it("trims and collapses internal whitespace", () => {
    expect(normalizeName("  Sok   Dara  ")).toBe("Sok Dara");
  });

  it("collapses tabs and newlines too", () => {
    expect(normalizeName("Sok\t\nDara")).toBe("Sok Dara");
  });

  it("preserves case", () => {
    expect(normalizeName("SOK dara")).toBe("SOK dara");
  });

  it("normalises to NFC so equivalent encodings agree", () => {
    const decomposed = "José"; // e + combining acute
    const composed = "José"; // precomposed é
    expect(normalizeName(decomposed)).toBe(normalizeName(composed));
  });

  it("handles Khmer script without mangling it", () => {
    expect(normalizeName("  សុខ  ដារា  ")).toBe("សុខ ដារា");
  });
});

describe("normalizeEmail", () => {
  it("lowercases and trims", () => {
    expect(normalizeEmail("  Sok.Dara@KIT.edu.KH ")).toBe("sok.dara@kit.edu.kh");
  });
});

describe("buildCanonicalPayload", () => {
  it("produces the documented shape", () => {
    expect(buildCanonicalPayload(base)).toBe(
      "v1|3f1a7b2c-8d4e-4f60-9a1b-2c3d4e5f6071|kit|CS101|Sok Dara|sok.dara@kit.edu.kh|2026-06-15|",
    );
  });

  it("keeps the trailing separator when there is no expiry", () => {
    expect(buildCanonicalPayload(base).endsWith("|")).toBe(true);
  });

  it("includes the expiry when present", () => {
    const payload = buildCanonicalPayload({ ...base, expiresOn: "2030-06-15" });
    expect(payload.endsWith("|2026-06-15|2030-06-15")).toBe(true);
  });

  it("uppercases the course code and lowercases the org slug and id", () => {
    const payload = buildCanonicalPayload({
      ...base,
      id: base.id.toUpperCase(),
      orgSlug: "KIT",
      courseCode: "cs101",
    });
    expect(payload).toBe(buildCanonicalPayload(base));
  });

  it("is insensitive to surrounding whitespace on every field", () => {
    const payload = buildCanonicalPayload({
      ...base,
      orgSlug: "  kit ",
      courseCode: " CS101  ",
      recipientName: " Sok Dara ",
      recipientEmail: " sok.dara@kit.edu.kh ",
      issuedOn: " 2026-06-15 ",
    });
    expect(payload).toBe(buildCanonicalPayload(base));
  });

  it("rejects a pipe character in a field", () => {
    expect(() =>
      buildCanonicalPayload({ ...base, recipientName: "Sok|Dara" }),
    ).toThrow(/'\|'/);
  });

  it("rejects a malformed issue date", () => {
    expect(() =>
      buildCanonicalPayload({ ...base, issuedOn: "15/06/2026" }),
    ).toThrow(/YYYY-MM-DD/);
  });

  it("rejects a malformed expiry date", () => {
    expect(() =>
      buildCanonicalPayload({ ...base, expiresOn: "2030" }),
    ).toThrow(/YYYY-MM-DD/);
  });

  it("rejects empty required fields", () => {
    expect(() => buildCanonicalPayload({ ...base, recipientName: "   " })).toThrow(
      /Recipient name/,
    );
  });
});

describe("hashCertificate", () => {
  it("returns a 0x-prefixed bytes32", () => {
    const hash = hashCertificate(base);
    expect(hash).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it("is deterministic", () => {
    expect(hashCertificate(base)).toBe(hashCertificate({ ...base }));
  });

  it("changes when any single field changes", () => {
    const original = hashCertificate(base);

    const variants: Array<Partial<CertificateFields>> = [
      { id: "00000000-0000-4000-8000-000000000000" },
      { orgSlug: "other" },
      { courseCode: "CS220" },
      { recipientName: "Sok Dana" },
      { recipientEmail: "someone.else@kit.edu.kh" },
      { issuedOn: "2026-06-16" },
      { expiresOn: "2030-06-15" },
    ];

    for (const variant of variants) {
      expect(hashCertificate({ ...base, ...variant })).not.toBe(original);
    }
  });

  it("ignores cosmetic differences that normalisation removes", () => {
    expect(
      hashCertificate({
        ...base,
        recipientName: "  Sok   Dara ",
        recipientEmail: "SOK.DARA@kit.edu.kh",
      }),
    ).toBe(hashCertificate(base));
  });
});
