import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb } from "pdf-lib";
import type { CertificatePdfInput } from "@/lib/cert/pdf";
import { qrPngBytes } from "@/lib/cert/qr";
import { KIT_BACKGROUND, QR_BOX, SIGNATURE_BOX,
  TEMPLATE_HEIGHT, TEMPLATE_WIDTH, templateText } from "@/lib/cert/template-layout";

export async function renderKitCertificatePdf(input: CertificatePdfInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  pdf.setTitle(`${input.courseTitle} — ${input.recipientName}`);
  pdf.setSubject(`Certificate ${input.certificateId}`);
  pdf.setProducer("KIT Certificate Verification");
  pdf.setCreationDate(new Date());
  // Keep the hash available without adding extra text over the supplied artwork.
  pdf.setKeywords([input.certHash, input.txHash || ""].filter(Boolean));
  const page = pdf.addPage([841.89, 841.89 * 210 / 297]);
  const scale = page.getWidth() / TEMPLATE_WIDTH;
  const background = await pdf.embedPng(await readFile(path.join(process.cwd(), "public", KIT_BACKGROUND)));
  const imageScale = Math.min(page.getWidth() / background.width, page.getHeight() / background.height);
  const width = background.width * imageScale;
  const height = background.height * imageScale;
  page.drawImage(background, { x: (page.getWidth() - width) / 2, y: (page.getHeight() - height) / 2, width, height });
  const fonts = {
    serif: await pdf.embedFont(await readFile(path.join(process.cwd(), "public/fonts/Tinos-Regular.ttf"))),
    bold: await pdf.embedFont(await readFile(path.join(process.cwd(), "public/fonts/Tinos-Bold.ttf"))),
    name: await pdf.embedFont(await readFile(path.join(process.cwd(), "public/fonts/Tinos-BoldItalic.ttf"))),
    metadata: await pdf.embedFont(await readFile(path.join(process.cwd(), "public/fonts/Inter-Regular.ttf"))),
  };
  const items = templateText({ ...input, title: input.courseTitle });
  for (const item of items) {
    const font = fonts[item.font];
    const [r, g, b] = [1, 3, 5].map((offset) => parseInt(item.color.slice(offset, offset + 2), 16) / 255);
    const color = rgb(r, g, b);
    const textSize = item.size * scale;
    const actualWidth = font.widthOfTextAtSize(item.text, textSize)
      + Math.max(0, Array.from(item.text).length - 1) * item.spacing * scale;
    const x = item.x * scale - (item.anchor === "middle" ? actualWidth / 2 : 0);
    const y = (TEMPLATE_HEIGHT - item.y) * scale;
    if (!item.spacing) page.drawText(item.text, { x, y, size: textSize, font, color });
    else {
      let cursor = x;
      const chars = Array.from(item.text);
      for (let index = 0; index < chars.length; index++) {
        const char = chars[index];
        page.drawText(char, { x: cursor, y, size: textSize, font, color });
        // Adjacent-pair measurement includes the font's kerning.
        const next = chars[index + 1];
        const advance = next ? font.widthOfTextAtSize(char + next, textSize) - font.widthOfTextAtSize(next, textSize)
          : font.widthOfTextAtSize(char, textSize);
        cursor += advance + item.spacing * scale;
      }
    }
  }
  const qr = await pdf.embedPng(await qrPngBytes(input.certificateId));
  page.drawImage(qr, { x: QR_BOX.x * scale, y: (TEMPLATE_HEIGHT - QR_BOX.y - QR_BOX.height) * scale,
    width: QR_BOX.width * scale, height: QR_BOX.height * scale });
  if (input.signatory?.image) {
    const source = input.signatory.image;
    const image = source.type === "png" ? await pdf.embedPng(source.bytes) : await pdf.embedJpg(source.bytes);
    const fit = Math.min(SIGNATURE_BOX.width / image.width, SIGNATURE_BOX.height / image.height);
    page.drawImage(image, {
      x: (SIGNATURE_BOX.x + (SIGNATURE_BOX.width - image.width * fit) / 2) * scale,
      y: (TEMPLATE_HEIGHT - SIGNATURE_BOX.y - SIGNATURE_BOX.height) * scale,
      width: image.width * fit * scale, height: image.height * fit * scale,
    });
  }
  return pdf.save();
}
