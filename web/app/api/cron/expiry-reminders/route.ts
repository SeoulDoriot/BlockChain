import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendExpiryReminderEmail } from "@/lib/email/send";
import { recordAudit } from "@/lib/audit";
import { serverEnv } from "@/lib/env.server";

export const maxDuration = 60;

/**
 * Expiry reminders.
 *
 * Note what this is NOT doing: it is not writing "expired" anywhere. Expiry is
 * still derived at read time by the contract. This job only sends a courtesy
 * email before the date arrives, and if it never runs, verification is still
 * completely correct.
 *
 * Protected by a shared secret in the Authorization header so it cannot be
 * triggered by anyone who finds the URL.
 */
const WINDOWS = [30, 7];

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${serverEnv.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const supabase = createAdminClient();
  const today = new Date();
  const sent: Array<{ id: string; daysLeft: number }> = [];

  for (const daysLeft of WINDOWS) {
    const target = new Date(today);
    target.setUTCDate(target.getUTCDate() + daysLeft);
    const targetDate = target.toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from("certificates")
      .select(
        `id, org_id, recipient_name, recipient_email, expires_on,
         course:courses!certificates_course_id_fkey ( title )`,
      )
      .eq("status", "issued")
      .eq("expires_on", targetDate);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    for (const row of (data ?? []) as unknown as Array<{
      id: string;
      org_id: string;
      recipient_name: string;
      recipient_email: string;
      expires_on: string;
      course: { title: string } | null;
    }>) {
      try {
        await sendExpiryReminderEmail({
          to: row.recipient_email,
          recipientName: row.recipient_name,
          courseTitle: row.course?.title ?? "your course",
          certificateId: row.id,
          expiresOn: row.expires_on,
          daysLeft,
        });

        await recordAudit({
          orgId: row.org_id,
          actor: null,
          action: "certificate.expiry_reminder_sent",
          entity: "certificate",
          entityId: row.id,
          meta: { daysLeft, expiresOn: row.expires_on },
        });

        sent.push({ id: row.id, daysLeft });
      } catch (error) {
        console.error(
          "[expiry-reminders] failed for",
          row.id,
          (error as Error).message,
        );
      }
    }
  }

  // Housekeeping while we are here.
  await supabase.rpc("prune_rate_limits");

  return NextResponse.json({ ok: true, sent: sent.length, details: sent });
}
