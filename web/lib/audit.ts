import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Audit rows are written with the service role because no RLS insert policy
 * exists for authenticated users — an audit trail the audited party can write
 * to is not an audit trail.
 */
export async function recordAudit(entry: {
  orgId: string;
  actor: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  meta?: Record<string, unknown>;
}): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("audit_log").insert({
    org_id: entry.orgId,
    actor: entry.actor,
    action: entry.action,
    entity: entry.entity,
    entity_id: entry.entityId ?? null,
    meta: entry.meta ?? {},
  });

  if (error) {
    // Never fail the user's operation because logging failed, but make it loud.
    console.error("[audit] failed to record entry:", error.message, entry);
  }
}
