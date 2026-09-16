import { NextResponse } from "next/server";
import { after } from "next/server";
import { requireIssuer, AuthError } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { issueCertificateSchema } from "@/lib/schemas";
import { issueCertificate } from "@/lib/cert/issue";
import { sendCertificateEmail } from "@/lib/email/send";
import { recordAudit } from "@/lib/audit";

// A chain write waits for a block to be mined. Amoy is fast, but not instant.
export const maxDuration = 60;

export async function POST(request: Request) {
  let context;
  try {
    context = await requireIssuer();
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }

  const parsed = issueCertificateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid details.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const supabase = createAdminClient();

  // Look up the course inside the caller's org — never trust a client-supplied
  // org id.
  const { data: course } = await supabase
    .from("courses")
    .select("id, code, title")
    .eq("id", input.courseId)
    .eq("org_id", context.org.id)
    .maybeSingle<{ id: string; code: string; title: string }>();

  if (!course) {
    return NextResponse.json({ error: "Unknown course." }, { status: 400 });
  }

  // Create the draft row first so the UUID exists — it is part of the hash.
  const { data: draft, error: draftError } = await supabase
    .from("certificates")
    .insert({
      org_id: context.org.id,
      course_id: course.id,
      recipient_name: input.recipientName,
      recipient_email: input.recipientEmail,
      issued_on: input.issuedOn,
      expires_on: input.expiresOn ?? null,
      status: "draft",
      issued_by: context.staff.id,
    })
    .select("id")
    .single<{ id: string }>();

  if (draftError || !draft) {
    return NextResponse.json(
      { error: draftError?.message ?? "Could not create certificate." },
      { status: 500 },
    );
  }

  try {
    const result = await issueCertificate({
      certificateId: draft.id,
      orgId: context.org.id,
      orgSlug: context.org.slug,
      orgName: context.org.name,
      courseCode: course.code,
      courseTitle: course.title,
      recipientName: input.recipientName,
      recipientEmail: input.recipientEmail,
      issuedOn: input.issuedOn,
      expiresOn: input.expiresOn ?? null,
      actorStaffId: context.staff.id,
    });

    // Email is the slowest step and the user does not need to wait for it.
    // after() runs once the response has been sent.
    after(async () => {
      try {
        await sendCertificateEmail({
          to: input.recipientEmail,
          recipientName: input.recipientName,
          orgName: context.org.name,
          courseCode: course.code,
          courseTitle: course.title,
          certificateId: draft.id,
          issuedOn: input.issuedOn,
          expiresOn: input.expiresOn ?? null,
          pdf: result.pdf,
        });
        await recordAudit({
          orgId: context.org.id,
          actor: context.staff.id,
          action: "certificate.email_sent",
          entity: "certificate",
          entityId: draft.id,
          meta: { to: input.recipientEmail },
        });
      } catch (error) {
        // A failed email must not undo an anchored certificate. Log it and
        // leave the "resend" action available.
        console.error("[issue] email failed:", (error as Error).message);
        await recordAudit({
          orgId: context.org.id,
          actor: context.staff.id,
          action: "certificate.email_failed",
          entity: "certificate",
          entityId: draft.id,
          meta: { error: (error as Error).message },
        });
      }
    });

    return NextResponse.json({
      id: draft.id,
      certHash: result.certHash,
      txHash: result.txHash,
    });
  } catch (error) {
    await recordAudit({
      orgId: context.org.id,
      actor: context.staff.id,
      action: "certificate.issue_failed",
      entity: "certificate",
      entityId: draft.id,
      meta: { error: (error as Error).message },
    });

    return NextResponse.json(
      {
        error: (error as Error).message,
        id: draft.id,
        hint: "The draft was saved. Use retry once the problem is fixed.",
      },
      { status: 500 },
    );
  }
}
