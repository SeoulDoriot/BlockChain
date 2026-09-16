import "server-only";

import { getTransport } from "@/lib/email/transport";
import { serverEnv } from "@/lib/env.server";
import { verifyUrl } from "@/lib/cert/qr";

export interface CertificateEmailInput {
  to: string;
  recipientName: string;
  orgName: string;
  courseCode: string;
  courseTitle: string;
  certificateId: string;
  issuedOn: string;
  expiresOn: string | null;
  pdf: Uint8Array;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function shell(body: string): string {
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#f6f6f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#18181b">
<div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e4e4e7;border-radius:12px;padding:32px">
${body}
</div></body></html>`;
}

export async function sendCertificateEmail(
  input: CertificateEmailInput,
): Promise<void> {
  const url = verifyUrl(input.certificateId);
  const expiry = input.expiresOn
    ? `<p style="margin:0 0 8px">Valid until <strong>${escapeHtml(input.expiresOn)}</strong>.</p>`
    : "";

  await getTransport().sendMail({
    from: serverEnv.SMTP_FROM,
    to: input.to,
    subject: `Your certificate — ${input.courseTitle}`,
    text: [
      `Dear ${input.recipientName},`,
      ``,
      `Your certificate for ${input.courseCode} — ${input.courseTitle} has been issued by ${input.orgName}.`,
      ``,
      `Issued on: ${input.issuedOn}`,
      input.expiresOn ? `Valid until: ${input.expiresOn}` : `No expiry.`,
      ``,
      `Verify it here: ${url}`,
      ``,
      `The PDF is attached. It carries a QR code that links to the same page.`,
    ].join("\n"),
    html: shell(`
      <h1 style="margin:0 0 16px;font-size:20px">Your certificate is ready</h1>
      <p style="margin:0 0 16px">Dear ${escapeHtml(input.recipientName)},</p>
      <p style="margin:0 0 16px">Your certificate for <strong>${escapeHtml(input.courseCode)} — ${escapeHtml(input.courseTitle)}</strong> has been issued by ${escapeHtml(input.orgName)} and recorded on the blockchain.</p>
      <p style="margin:0 0 8px">Issued on <strong>${escapeHtml(input.issuedOn)}</strong>.</p>
      ${expiry}
      <p style="margin:24px 0"><a href="${url}" style="display:inline-block;background:#1f51a8;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px">Verify this certificate</a></p>
      <p style="margin:0;color:#71717a;font-size:13px">The PDF is attached and carries a QR code linking to the same page. Anyone can verify it without an account.</p>
    `),
    attachments: [
      {
        filename: `certificate-${input.certificateId}.pdf`,
        content: Buffer.from(input.pdf),
        contentType: "application/pdf",
      },
    ],
  });
}

export async function sendExpiryReminderEmail(input: {
  to: string;
  recipientName: string;
  courseTitle: string;
  certificateId: string;
  expiresOn: string;
  daysLeft: number;
}): Promise<void> {
  const url = verifyUrl(input.certificateId);

  await getTransport().sendMail({
    from: serverEnv.SMTP_FROM,
    to: input.to,
    subject: `Your certificate expires in ${input.daysLeft} days`,
    text: [
      `Dear ${input.recipientName},`,
      ``,
      `Your certificate for ${input.courseTitle} expires on ${input.expiresOn} (${input.daysLeft} days from now).`,
      ``,
      `Verify it here: ${url}`,
    ].join("\n"),
    html: shell(`
      <h1 style="margin:0 0 16px;font-size:20px">Your certificate expires soon</h1>
      <p style="margin:0 0 16px">Dear ${escapeHtml(input.recipientName)},</p>
      <p style="margin:0 0 16px">Your certificate for <strong>${escapeHtml(input.courseTitle)}</strong> expires on <strong>${escapeHtml(input.expiresOn)}</strong> — ${input.daysLeft} days from now.</p>
      <p style="margin:24px 0"><a href="${url}" style="display:inline-block;background:#1f51a8;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px">View certificate</a></p>
      <p style="margin:0;color:#71717a;font-size:13px">If you need it renewed, contact the issuing institution.</p>
    `),
  });
}
