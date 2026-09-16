import "server-only";

import { NextResponse } from "next/server";
import { AuthError, requireIssuer, type StaffContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export interface CertificateContext {
  context: StaffContext;
  certificate: {
    id: string;
    org_id: string;
    course_id: string;
    recipient_name: string;
    recipient_email: string;
    issued_on: string;
    expires_on: string | null;
    cert_hash: string | null;
    tx_hash: string | null;
    pdf_path: string | null;
    status: "draft" | "issued" | "revoked";
  };
  course: { id: string; code: string; title: string };
}

/**
 * Shared guard for every certificate action route: authenticate, then load the
 * certificate scoped to the caller's own organisation.
 */
export async function loadCertificateForAction(
  id: string,
): Promise<CertificateContext | NextResponse> {
  let context: StaffContext;
  try {
    context = await requireIssuer();
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("certificates")
    .select(
      `id, org_id, course_id, recipient_name, recipient_email, issued_on,
       expires_on, cert_hash, tx_hash, pdf_path, status,
       course:courses!certificates_course_id_fkey ( id, code, title )`,
    )
    .eq("id", id)
    .eq("org_id", context.org.id)
    .maybeSingle();

  if (!data) {
    return NextResponse.json({ error: "Certificate not found." }, { status: 404 });
  }

  const { course, ...certificate } = data as unknown as
    CertificateContext["certificate"] & {
      course: CertificateContext["course"] | null;
    };

  if (!course) {
    return NextResponse.json(
      { error: "Certificate has no course." },
      { status: 500 },
    );
  }

  return { context, certificate, course };
}

export function errorResponse(error: unknown, status = 500): NextResponse {
  return NextResponse.json(
    { error: error instanceof Error ? error.message : String(error) },
    { status },
  );
}
