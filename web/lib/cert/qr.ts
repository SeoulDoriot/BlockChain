import "server-only";

import QRCode from "qrcode";
import { env } from "@/lib/env";

/** The URL a QR code points at — a real link, so a phone camera can open it. */
export function verifyUrl(certificateId: string): string {
  return `${env.NEXT_PUBLIC_APP_URL}/verify/${certificateId}`;
}

/** QR code as raw PNG bytes, for embedding into a PDF. */
export async function qrPngBytes(certificateId: string): Promise<Uint8Array> {
  const buffer = await QRCode.toBuffer(verifyUrl(certificateId), {
    type: "png",
    errorCorrectionLevel: "M",
    margin: 1,
    width: 600,
  });
  return new Uint8Array(buffer);
}

/** QR code as a data URL, for rendering in HTML. */
export async function qrDataUrl(certificateId: string): Promise<string> {
  return QRCode.toDataURL(verifyUrl(certificateId), {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 400,
  });
}
