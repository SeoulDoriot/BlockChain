import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { consumeRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { verifyCertificateById } from "@/lib/verify";

export const maxDuration = 30;

const MAX_BYTES = 5 * 1024 * 1024;

/**
 * PDF tamper check.
 *
 * Hashes the uploaded file and looks for a certificate whose stored
 * pdf_sha256 matches. A single altered byte — a changed name, a nudged date,
 * a re-saved file — produces a different digest and no match.
 *
 * Public and unauthenticated, so it is rate limited.
 */
export async function POST(request: Request) {
  const limit = await consumeRateLimit("verify-upload", 20, 300);
  if (!limit.ok) return rateLimitResponse(limit);

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  }

  if (file.size === 0) {
    return NextResponse.json({ error: "The file is empty." }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "That file is larger than 5 MB." },
      { status: 413 },
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  // Cheap sanity check before hashing: a PDF starts with %PDF-
  const header = new TextDecoder().decode(bytes.slice(0, 5));
  if (header !== "%PDF-") {
    return NextResponse.json(
      { result: "not_a_pdf", error: "That file is not a PDF." },
      { status: 400 },
    );
  }

  const digest = createHash("sha256").update(bytes).digest("hex");

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("certificates")
    .select("id")
    .eq("pdf_sha256", digest)
    .maybeSingle<{ id: string }>();

  if (!data) {
    return NextResponse.json({
      result: "tampered",
      sha256: digest,
      message:
        "This file does not match any certificate we issued. It has been " +
        "altered, or it was not issued here.",
    });
  }

  const verification = await verifyCertificateById(data.id);

  return NextResponse.json({
    result: "match",
    sha256: digest,
    certificateId: data.id,
    status: verification.status,
  });
}
