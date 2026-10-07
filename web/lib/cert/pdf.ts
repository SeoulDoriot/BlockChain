import "server-only";

import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";
import { qrPngBytes, verifyUrl } from "@/lib/cert/qr";
import { renderKitCertificatePdf } from "@/lib/cert/kit-pdf";
import type { CertificateTemplate } from "@/lib/cert/template-layout";

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
  templateId?: CertificateTemplate;
  certificateTitle?: string;
  description?: string;
  certificateId: string;
  orgName: string;
  recipientName: string;
  courseCode: string;
  courseTitle: string;
  issuedOn: string;
  expiresOn: string | null;
  certHash: string;
  txHash: string | null;
  /** Who signs. All optional: an unconfigured org keeps a blank signature line. */
  signatory?: {
    name: string | null;
    title: string | null;
    image: { bytes: Uint8Array; type: "png" | "jpg" } | null;
  };
}

const A4_LANDSCAPE: [number, number] = [841.89, 595.28];

// Matches the on-screen template: near-black ink, quiet grey, hairline rules.
const INK = rgb(0.114, 0.114, 0.122); // #1d1d1f
const MUTED = rgb(0.431, 0.431, 0.451); // #6e6e73
const RULE = rgb(0.91, 0.91, 0.91); // #e8e8e8

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
  if (input.templateId !== "classic") return renderKitCertificatePdf(input);
  const pdf = await PDFDocument.create();

  pdf.setTitle(`${input.courseTitle} — ${input.recipientName}`);
  pdf.setSubject(`Certificate ${input.certificateId}`);
  pdf.setProducer("KIT Certificate Verification");
  pdf.setCreationDate(new Date());

  const page = pdf.addPage(A4_LANDSCAPE);
  const [pageWidth, pageHeight] = A4_LANDSCAPE;

  const serif = await pdf.embedFont(StandardFonts.Helvetica);
  const serifBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const mono = await pdf.embedFont(StandardFonts.Courier);

  // --- border -------------------------------------------------------------
  page.drawRectangle({
    x: 28,
    y: 28,
    width: pageWidth - 56,
    height: pageHeight - 56,
    borderColor: RULE,
    borderWidth: 1,
  });

  // --- header -------------------------------------------------------------
  drawCentered(page, input.orgName.toUpperCase().split("").join(" "), serifBold, 9, pageHeight - 84, MUTED);

  // --- recipient ----------------------------------------------------------
  drawCentered(page, input.certificateTitle || "Certificate of Completion", serif, 12, pageHeight - 160, MUTED);
  drawCentered(page, input.recipientName, serifBold, 38, pageHeight - 214);
  drawCentered(page, input.description || "has successfully completed", serif, 12, pageHeight - 248, MUTED);
  drawCentered(page, input.courseTitle, serifBold, 18, pageHeight - 280);

  // --- dates --------------------------------------------------------------
  const dateLine = input.expiresOn
    ? `Issued ${input.issuedOn}   ·   Valid until ${input.expiresOn}`
    : `Issued ${input.issuedOn}   ·   No expiry`;
  drawCentered(page, dateLine, serif, 10, pageHeight - 310, MUTED);

  // --- signature ----------------------------------------------------------
  const signatory = input.signatory;
  if (signatory?.image) {
    const image =
      signatory.image.type === "png"
        ? await pdf.embedPng(signatory.image.bytes)
        : await pdf.embedJpg(signatory.image.bytes);
    // Fit inside a 150×44 box above the line, preserving the aspect ratio.
    const scale = Math.min(150 / image.width, 44 / image.height, 1);
    page.drawImage(image, {
      x: 64,
      y: 248,
      width: image.width * scale,
      height: image.height * scale,
    });
  }
  page.drawLine({
    start: { x: 64, y: 244 },
    end: { x: 244, y: 244 },
    thickness: 0.75,
    color: INK,
  });
  if (signatory?.name) {
    page.drawText(signatory.name, { x: 64, y: 230, size: 10, font: serifBold, color: INK });
    if (signatory.title) {
      page.drawText(signatory.title, { x: 64, y: 217, size: 8.5, font: serif, color: MUTED });
    }
  } else {
    page.drawText("Authorised signature", { x: 64, y: 230, size: 8, font: serif, color: MUTED });
  }

  // --- QR -----------------------------------------------------------------
  const qrImage = await pdf.embedPng(await qrPngBytes(input.certificateId));
  const qrSize = 116;
  const qrX = pageWidth - 64 - qrSize;
  const qrY = 80;

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
  let blockY = 196;

  page.drawText("Verification", {
    x: blockX,
    y: blockY,
    size: 9,
    font: serifBold,
    color: INK,
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
    `Certificate ID ${input.certificateId}. Any alteration to this document invalidates it.`,
    { x: 64, y: 46, size: 7.5, font: serif, color: MUTED },
  );

  return pdf.save();
}
