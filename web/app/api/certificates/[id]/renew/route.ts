import { NextResponse } from "next/server";
import { after } from "next/server";
import { loadCertificateForAction, errorResponse } from "@/lib/api";
import { renewSchema } from "@/lib/schemas";
import { createAdminClient } from "@/lib/supabase/admin";
import { issueCertificate } from "@/lib/cert/issue";
import { sendCertificateEmail } from "@/lib/email/send";
import { recordAudit } from "@/lib/audit";

export const maxDuration = 60;

/**
 * Renewal issues a NEW certificate rather than editing the old one.
 *
 * The expiry date is part of the hash, so changing it in place would break
 * verification for every copy of the old PDF already in circulation. Instead
 * the old certificate keeps reading "Expired" — which is true — and a fresh
 * certificate with its own id, hash and anchor is issued alongside it.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const loaded = await loadCertificateForAction(id);
  if (loaded instanceof NextResponse) return loaded;

  const { context, certificate, course } = loaded;

  if (certificate.status === "revoked") {
    return NextResponse.json(
      { error: "A revoked certificate cannot be renewed." },
      { status: 409 },
    );
  }

  const parsed = renewSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid expiry." },
      { status: 400 },
    );
  }

  const issuedOn = new Date().toISOString().slice(0, 10);

  if (parsed.data.expiresOn <= issuedOn) {
    return NextResponse.json(
      { error: "The new expiry must be in the future." },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();

  const { data: draft, error: draftError } = await supabase
    .from("certificates")
    .insert({
      template_id: certificate.template_id,
      certificate_title: certificate.certificate_title,
      description: certificate.description,
      org_id: context.org.id,
      course_id: certificate.course_id,
      recipient_name: certificate.recipient_name,
      recipient_email: certificate.recipient_email,
      issued_on: issuedOn,
      expires_on: parsed.data.expiresOn,
      status: "draft",
      issued_by: context.staff.id,
    })
    .select("id")
    .single<{ id: string }>();

  if (draftError || !draft) {
    return errorResponse(draftError?.message ?? "Could not create renewal.");
  }

  try {
    const result = await issueCertificate({
      templateId: certificate.template_id,
      certificateTitle: certificate.certificate_title,
      description: certificate.description,
      certificateId: draft.id,
      orgId: context.org.id,
      orgSlug: context.org.slug,
      orgName: context.org.name,
      courseCode: course.code,
      courseTitle: course.title,
      recipientName: certificate.recipient_name,
      recipientEmail: certificate.recipient_email,
      issuedOn,
      expiresOn: parsed.data.expiresOn,
      actorStaffId: context.staff.id,
    });

    await recordAudit({
      orgId: context.org.id,
      actor: context.staff.id,
      action: "certificate.renewed",
      entity: "certificate",
      entityId: draft.id,
      meta: { renewedFrom: certificate.id, expiresOn: parsed.data.expiresOn },
    });

    after(async () => {
      try {
        await sendCertificateEmail({
          to: certificate.recipient_email,
          recipientName: certificate.recipient_name,
          orgName: context.org.name,
          courseCode: course.code,
          courseTitle: course.title,
          certificateId: draft.id,
          issuedOn,
          expiresOn: parsed.data.expiresOn,
          pdf: result.pdf,
        });
      } catch (error) {
        console.error("[renew] email failed:", (error as Error).message);
      }
    });

    return NextResponse.json({
      id: draft.id,
      certHash: result.certHash,
      txHash: result.txHash,
      renewedFrom: certificate.id,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
