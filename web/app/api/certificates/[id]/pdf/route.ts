import { NextResponse } from "next/server";
import { loadCertificateForAction, errorResponse } from "@/lib/api";
import { signedPdfUrl } from "@/lib/cert/storage";

/**
 * Redirects to a short-lived signed URL. The bucket is private with no
 * policies, so this route is the only path to a certificate PDF.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const loaded = await loadCertificateForAction(id);
  if (loaded instanceof NextResponse) return loaded;

  const { certificate } = loaded;

  if (!certificate.pdf_path) {
    return NextResponse.json(
      { error: "This certificate has no PDF yet." },
      { status: 404 },
    );
  }

  try {
    const url = await signedPdfUrl(certificate.pdf_path, 300);
    return NextResponse.redirect(url);
  } catch (error) {
    return errorResponse(error);
  }
}
