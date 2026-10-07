import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "certificates";

/** Storage path for a certificate PDF. */
export function pdfPath(orgId: string, certificateId: string): string {
  return `${orgId}/${certificateId}.pdf`;
}

export async function uploadPdf(
  path: string,
  bytes: Uint8Array,
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (error) throw new Error(`PDF upload failed: ${error.message}`);
}

export async function downloadPdf(path: string): Promise<Uint8Array> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error || !data) throw new Error(`PDF download failed: ${error?.message}`);
  return new Uint8Array(await data.arrayBuffer());
}

/**
 * Short-lived signed URL. The bucket is private with no policies, so this is
 * the only way a PDF ever reaches a browser.
 */
export async function signedPdfUrl(
  path: string,
  expiresInSeconds = 300,
): Promise<string> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, expiresInSeconds, { download: true });

  if (error || !data) {
    throw new Error(`Could not sign PDF URL: ${error?.message}`);
  }
  return data.signedUrl;
}

/** Signature images live in the same private bucket, under the org's folder. */
export function signaturePath(orgId: string, ext: "png" | "jpg"): string {
  return `${orgId}/signatures/${Date.now()}.${ext}`;
}

export async function uploadSignature(
  path: string,
  bytes: Uint8Array,
  contentType: string,
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType, upsert: false });
  if (error) throw new Error(`Signature upload failed: ${error.message}`);
}

/** Returns null rather than throwing: a missing image must not block issuing. */
export async function downloadSignature(
  path: string,
): Promise<{ bytes: Uint8Array; type: "png" | "jpg" } | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error || !data) return null;
  return {
    bytes: new Uint8Array(await data.arrayBuffer()),
    type: path.endsWith(".png") ? "png" : "jpg",
  };
}
