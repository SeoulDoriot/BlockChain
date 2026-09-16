import { NextResponse } from "next/server";
import { after } from "next/server";
import { loadCertificateForAction, errorResponse } from "@/lib/api";
import { issueCertificate } from "@/lib/cert/issue";
import { sendCertificateEmail } from "@/lib/email/send";

export const maxDuration = 60;

/**
 * Retry a draft whose issuing failed partway — a dropped RPC connection, an
 * out-of-gas deployer, a storage hiccup. The row already exists, so its id
 * (and therefore its hash) is unchanged and the retry is safe to repeat.
 *
 * If the chain write actually succeeded last time, the contract rejects the
 * duplicate with CertificateAlreadyIssued, which surfaces here rather than
 * silently double-anchoring.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const loaded = await loadCertificateForAction(id);
  if (loaded instanceof NextResponse) return loaded;

  const { context, certificate, course } = loaded;

  if (certificate.status !== "draft") {
    return NextResponse.json(
      { error: `Only a draft can be retried (this one is ${certificate.status}).` },
      { status: 409 },
    );
  }

  try {
    const result = await issueCertificate({
      certificateId: certificate.id,
      orgId: context.org.id,
      orgSlug: context.org.slug,
      orgName: context.org.name,
      courseCode: course.code,
      courseTitle: course.title,
      recipientName: certificate.recipient_name,
      recipientEmail: certificate.recipient_email,
      issuedOn: certificate.issued_on,
      expiresOn: certificate.expires_on,
      actorStaffId: context.staff.id,
    });

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
          pdf: result.pdf,
        });
      } catch (error) {
        console.error("[retry] email failed:", (error as Error).message);
      }
    });

    return NextResponse.json({
      ok: true,
      certHash: result.certHash,
      txHash: result.txHash,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
