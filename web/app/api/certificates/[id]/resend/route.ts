import { NextResponse } from "next/server";
import { after } from "next/server";
import { loadCertificateForAction, errorResponse } from "@/lib/api";
import { downloadPdf } from "@/lib/cert/storage";
import { sendCertificateEmail } from "@/lib/email/send";
import { recordAudit } from "@/lib/audit";
import { consumeRateLimit } from "@/lib/rate-limit";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const loaded = await loadCertificateForAction(id);
  if (loaded instanceof NextResponse) return loaded;

  const { context, certificate, course } = loaded;

  if (certificate.status !== "issued" || !certificate.pdf_path) {
    return NextResponse.json(
      { error: "Only an issued certificate with a stored PDF can be resent." },
      { status: 409 },
    );
  }

  // Stop the resend button becoming an outbound spam cannon.
  const limit = await consumeRateLimit(`resend:${id}`, 5, 3600, id);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "This certificate has been resent too many times in the last hour." },
      { status: 429 },
    );
  }

  try {
    const pdf = await downloadPdf(certificate.pdf_path);

    after(async () => {
      try {
        await sendCertificateEmail({
          to: certificate.recipient_email,
          recipientName: certificate.recipient_name,
          orgName: context.org.name,
          courseCode: course.code,
          courseTitle: course.title,
          certificateId: certificate.id,
          issuedOn: certificate.issued_on,
          expiresOn: certificate.expires_on,
          pdf,
        });
        await recordAudit({
          orgId: context.org.id,
          actor: context.staff.id,
          action: "certificate.email_resent",
          entity: "certificate",
          entityId: certificate.id,
          meta: { to: certificate.recipient_email },
        });
      } catch (error) {
        console.error("[resend] email failed:", (error as Error).message);
      }
    });

    return NextResponse.json({ ok: true, to: certificate.recipient_email });
  } catch (error) {
    return errorResponse(error);
  }
}
