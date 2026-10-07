import { Encodings, Font, FontNames } from "@pdf-lib/standard-fonts";

export const KIT_BACKGROUND = "/certificate-templates/kit-red.png";
export const DEFAULT_CERTIFICATE_TITLE = "Certificate of Completion";
export const DEFAULT_DESCRIPTION = "has successfully completed";
export type CertificateTemplate = "classic" | "kit-red";
export const TEMPLATE_WIDTH = 1000;
export const TEMPLATE_HEIGHT = TEMPLATE_WIDTH * 210 / 297;
export const TEMPLATE_FONTS = {
  serif: FontNames.TimesRoman,
  bold: FontNames.TimesRomanBold,
  name: FontNames.TimesRomanBoldItalic,
  metadata: FontNames.Helvetica,
} as const;
export type TemplateFont = keyof typeof TEMPLATE_FONTS;

export interface TemplateData {
  recipientName?: string;
  title?: string;
  certificateTitle?: string;
  description?: string;
  issuedOn?: string;
  expiresOn?: string | null;
  certificateId?: string;
}

export interface TemplateText {
  text: string;
  x: number;
  /** Baseline measured from the top, shared by SVG and PDF. */
  y: number;
  size: number;
  font: TemplateFont;
  color: string;
  anchor: "middle" | "start";
  spacing: number;
}

export function textWidth(text: string, size: number, key: TemplateFont, spacing = 0): number {
  const font = Font.load(TEMPLATE_FONTS[key]);
  const glyphs = Array.from(text, (char) => {
    const point = char.codePointAt(0)!;
    return Encodings.WinAnsi.canEncodeUnicodeCodePoint(point)
      ? Encodings.WinAnsi.encodeUnicodeCodePoint(point).name : "question";
  });
  const width = glyphs.reduce((sum, glyph, index) => sum
    + (font.getWidthOfGlyph(glyph) ?? 600)
    + (font.getXAxisKerningForPair(glyph, glyphs[index + 1] ?? "") ?? 0), 0);
  return width * size / 1000 + Math.max(0, glyphs.length - 1) * spacing;
}

function dateLabel(value?: string) {
  if (!value) return "ISSUE DATE";
  return new Date(`${value}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  }).toUpperCase();
}

export function templateText(data: TemplateData): TemplateText[] {
  function centered(text: string, top: number, size: number, font: TemplateFont,
    color = "#161616", spacing = 0, width = 800): TemplateText {
    const naturalWidth = textWidth(text, size, font, spacing);
    const fittedSize = naturalWidth > width ? size * width / naturalWidth : size;
    return { text, x: 500, y: TEMPLATE_HEIGHT * top + fittedSize * 0.85,
      size: fittedSize, font, color, anchor: "middle", spacing };
  }
  const description = data.description || DEFAULT_DESCRIPTION;
  // Wrap at words once, then fit each line without dropping certificate data.
  const words = description.split(/\s+/);
  const lines: string[] = [""];
  for (const word of words) {
    const candidate = [lines[lines.length - 1], word].filter(Boolean).join(" ");
    if (lines.length === 1 && textWidth(candidate, 18, "serif") > 760) lines.push(word);
    else lines[lines.length - 1] = candidate;
  }
  const items = [
    centered(data.certificateTitle || DEFAULT_CERTIFICATE_TITLE, 0.31, 38, "bold", "#981b24"),
    centered("THIS IS TO CERTIFY THAT", 0.39, 15, "metadata", "#333333", 2),
    centered(data.recipientName || "Recipient name", 0.45, 36, "name"),
    ...lines.map((line, index) => centered(line, 0.52 + index * 0.029, 18, "serif")),
    centered(data.title || "Course / Program Name", 0.59, 29, "bold", "#981b24"),
    centered(`ISSUED ${dateLabel(data.issuedOn)}`, 0.66, 15, "metadata", "#333333", 1.5),
  ];
  if (data.expiresOn) items.push(centered(`VALID UNTIL ${dateLabel(data.expiresOn)}`, 0.695, 11, "metadata"));
  items.push({ text: data.certificateId || "Certificate ID assigned on issue", x: 60,
    y: TEMPLATE_HEIGHT * 0.915, size: 12, font: "metadata", color: "#333333", anchor: "start", spacing: 0 });
  return items;
}

// Calibrated to the QR brackets and signature line already in the supplied image.
export const QR_BOX = { x: 72, y: TEMPLATE_HEIGHT * 0.71, width: 92, height: 92 };
export const SIGNATURE_BOX = { x: 400, y: TEMPLATE_HEIGHT * 0.848 - 47, width: 200, height: 47 };
