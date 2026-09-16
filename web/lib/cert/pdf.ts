import "server-only";

import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";
import { qrPngBytes, verifyUrl } from "@/lib/cert/qr";

/**
 * Renders the certificate PDF.
 *
 * pdf-lib runs on the server only — it is never shipped to the browser, which
 * the `server-only` import above enforces.
 *
 * The exact bytes of this PDF are NOT what gets hashed. The hash covers the
 * canonical field payload (CLAUDE.md §3), so regenerating the PDF for the same
 * certificate never invalidates it.
 */

export interface CertificatePdfInput {
  certificateId: string;
  orgName: string;
  recipientName: string;
  courseCode: string;
  courseTitle: string;
  issuedOn: string;
  expiresOn: string | null;
  certHash: string;
  txHash: string | null;
}

const A4_LANDSCAPE: [number, number] = [841.89, 595.28];

const INK = rgb(0.09, 0.09, 0.11);
const MUTED = rgb(0.42, 0.42, 0.47);
const ACCENT = rgb(0.13, 0.32, 0.55);
const RULE = rgb(0.83, 0.83, 0.86);

function drawCentered(
  page: PDFPage,
  text: string,
  font: PDFFont,
  size: number,
  y: number,
  color = INK,
) {
  const width = font.widthOfTextAtSize(text, size);
  page.drawText(text, {
    x: (A4_LANDSCAPE[0] - width) / 2,
    y,
    size,
    font,
    color,
  });
}

/** Break a hex string so it wraps predictably in a fixed-width slot. */
function splitHash(hash: string): [string, string] {
  const mid = Math.ceil(hash.length / 2);
  return [hash.slice(0, mid), hash.slice(mid)];
}

export async function renderCertificatePdf(
  input: CertificatePdfInput,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();

  pdf.setTitle(`${input.courseTitle} — ${input.recipientName}`);
  pdf.setSubject(`Certificate ${input.certificateId}`);
  pdf.setProducer("KIT Certificate Verification");
  pdf.setCreationDate(new Date());

  const page = pdf.addPage(A4_LANDSCAPE);
  const [pageWidth, pageHeight] = A4_LANDSCAPE;

  const serif = await pdf.embedFont(StandardFonts.TimesRoman);
  const serifBold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const serifItalic = await pdf.embedFont(StandardFonts.TimesRomanItalic);
  const mono = await pdf.embedFont(StandardFonts.Courier);

  // --- border -------------------------------------------------------------
  page.drawRectangle({
    x: 24,
    y: 24,
    width: pageWidth - 48,
    height: pageHeight - 48,
    borderColor: ACCENT,
    borderWidth: 2,
  });
  page.drawRectangle({
    x: 32,
    y: 32,
    width: pageWidth - 64,
    height: pageHeight - 64,
    borderColor: RULE,
    borderWidth: 0.75,
  });

  // --- header -------------------------------------------------------------
  drawCentered(page, input.orgName.toUpperCase(), serifBold, 16, pageHeight - 90, ACCENT);
  drawCentered(page, "CERTIFICATE OF COMPLETION", serif, 11, pageHeight - 112, MUTED);

  page.drawLine({
    start: { x: pageWidth / 2 - 60, y: pageHeight - 128 },
    end: { x: pageWidth / 2 + 60, y: pageHeight - 128 },
    thickness: 1,
    color: ACCENT,
  });

  // --- recipient ----------------------------------------------------------
  drawCentered(page, "This is to certify that", serifItalic, 13, pageHeight - 172, MUTED);
  drawCentered(page, input.recipientName, serifBold, 34, pageHeight - 220);
  drawCentered(
    page,
    "has successfully completed the course",
    serifItalic,
    13,
    pageHeight - 252,
    MUTED,
  );
  drawCentered(
    page,
    `${input.courseCode} — ${input.courseTitle}`,
    serifBold,
    18,
    pageHeight - 286,
  );

  // --- dates --------------------------------------------------------------
  const dateLine = input.expiresOn
    ? `Issued ${input.issuedOn}   ·   Valid until ${input.expiresOn}`
    : `Issued ${input.issuedOn}   ·   No expiry`;
  drawCentered(page, dateLine, serif, 11, pageHeight - 318, MUTED);

  // --- QR -----------------------------------------------------------------
  const qrImage = await pdf.embedPng(await qrPngBytes(input.certificateId));
  const qrSize = 116;
  const qrX = pageWidth - 64 - qrSize;
  const qrY = 74;

  page.drawImage(qrImage, { x: qrX, y: qrY, width: qrSize, height: qrSize });
  page.drawText("Scan to verify", {
    x: qrX + (qrSize - serif.widthOfTextAtSize("Scan to verify", 9)) / 2,
    y: qrY - 14,
    size: 9,
    font: serif,
    color: MUTED,
  });

  // --- verification block -------------------------------------------------
  const blockX = 64;
  let blockY = 176;

  page.drawText("VERIFICATION", {
    x: blockX,
    y: blockY,
    size: 9,
    font: serifBold,
    color: ACCENT,
  });
  blockY -= 16;

  page.drawText(verifyUrl(input.certificateId), {
    x: blockX,
    y: blockY,
    size: 8.5,
    font: mono,
    color: INK,
  });
  blockY -= 20;

  page.drawText("Certificate hash (keccak256)", {
    x: blockX,
    y: blockY,
    size: 8,
    font: serif,
    color: MUTED,
  });
  blockY -= 12;

  const [hashTop, hashBottom] = splitHash(input.certHash);
  page.drawText(hashTop, { x: blockX, y: blockY, size: 7.5, font: mono, color: INK });
  blockY -= 10;
  page.drawText(hashBottom, { x: blockX, y: blockY, size: 7.5, font: mono, color: INK });

  if (input.txHash) {
    blockY -= 18;
    page.drawText("Blockchain transaction", {
      x: blockX,
      y: blockY,
      size: 8,
      font: serif,
      color: MUTED,
    });
    blockY -= 12;
    const [txTop, txBottom] = splitHash(input.txHash);
    page.drawText(txTop, { x: blockX, y: blockY, size: 7.5, font: mono, color: INK });
    blockY -= 10;
    page.drawText(txBottom, { x: blockX, y: blockY, size: 7.5, font: mono, color: INK });
  }

  // --- footer -------------------------------------------------------------
  page.drawLine({
    start: { x: 64, y: 62 },
    end: { x: pageWidth - 64 - qrSize - 24, y: 62 },
    thickness: 0.75,
    color: RULE,
  });
  page.drawText(
    "This certificate is anchored on the Polygon blockchain. Any alteration to this document invalidates it.",
    { x: 64, y: 46, size: 7.5, font: serif, color: MUTED },
  );

  return pdf.save();
}
