import { describe, expect, it, vi } from "vitest";
import { PDFDocument } from "pdf-lib";
import QRCode from "qrcode";
import { writeFile } from "node:fs/promises";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/env", () => ({ env: { NEXT_PUBLIC_APP_URL: "http://localhost:3000" } }));

import { renderCertificatePdf } from "@/lib/cert/pdf";
import { templateText, textWidth, TEMPLATE_HEIGHT } from "@/lib/cert/template-layout";
import { issueCertificateSchema } from "@/lib/schemas";

const sample = {
  templateId: "kit-red" as const,
  certificateTitle: "Certificate of Achievement",
  description: "has successfully completed the requirements for",
  certificateId: "3f1a7b2c-8d4e-4f60-9a1b-2c3d4e5f6071",
  orgName: "Kirirom Institute of Technology",
  recipientName: "Sokha Chan",
  courseCode: "CS101",
  courseTitle: "Introduction to Software Engineering",
  issuedOn: "2026-10-04",
  expiresOn: "2027-10-04",
  certHash: `0x${"ab".repeat(32)}`,
  txHash: null,
};

describe("fixed KIT certificate template", () => {
  it("generates a printable landscape A4 PDF with verification metadata", async () => {
    const bytes = await renderCertificatePdf(sample);
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(1);
    const page = pdf.getPages()[0];
    expect(page.getWidth()).toBeCloseTo(841.89);
    expect(page.getWidth() / page.getHeight()).toBeCloseTo(297 / 210, 5);
    expect(pdf.getKeywords()).toContain(sample.certHash);
    expect(pdf.getSubject()).toContain(sample.certificateId);
    if (process.env.CERTIFICATE_QA_OUTPUT) await writeFile(process.env.CERTIFICATE_QA_OUTPUT, bytes);
  });

  it("embeds a configured signature and retains the classic renderer", async () => {
    const image = await QRCode.toBuffer("signature image fixture");
    const signed = await renderCertificatePdf({ ...sample, signatory: { name: "Signer", title: "Dean", image: { bytes: image, type: "png" } } });
    expect((await PDFDocument.load(signed)).getPageCount()).toBe(1);
    expect((await PDFDocument.load(await renderCertificatePdf({ ...sample, templateId: "classic" }))).getPageCount()).toBe(1);
  });

  it("keeps long names and program titles inside their slots without truncating", () => {
    const name = "Alexandra ".repeat(20).trim();
    const title = "Advanced Software Engineering and Information Systems ".repeat(2).trim();
    const items = templateText({ recipientName: name, title });
    for (const value of [name, title]) {
      const item = items.find((entry) => entry.text === value)!;
      expect(item).toBeDefined();
      expect(textWidth(item.text, item.size, item.font)).toBeLessThanOrEqual(800.001);
    }
    const nameItem = items.find((item) => item.text === name)!;
    expect(nameItem.y - nameItem.size * 0.85).toBeCloseTo(TEMPLATE_HEIGHT * 0.45);
  });

  it("validates and preserves custom presentation data for drafts and issuance", () => {
    const input = { courseId: sample.certificateId, recipientName: "Sokha Chan",
      recipientEmail: "sokha@example.com", issuedOn: sample.issuedOn,
      certificateTitle: "  Award of Excellence  ", description: "  for outstanding performance  ", draft: true };
    const parsed = issueCertificateSchema.parse(input);
    expect(parsed.templateId).toBe("kit-red");
    expect(parsed.certificateTitle).toBe("Award of Excellence");
    expect(parsed.description).toBe("for outstanding performance");
    expect(issueCertificateSchema.safeParse({ ...input, description: "x".repeat(181) }).success).toBe(false);
  });
});
