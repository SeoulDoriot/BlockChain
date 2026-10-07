import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const PAGE_SIZE = 50;

interface AuditRow {
  id: number;
  action: string;
  entity: string;
  entity_id: string | null;
  meta: Record<string, unknown>;
  created_at: string;
  actor: { full_name: string | null; email: string } | null;
}

/** Authenticated on every request, so this route is expected to block. */
export const instant = false;

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireStaff();
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);
  const from = (page - 1) * PAGE_SIZE;

  const supabase = await createClient();
  const { data, count } = await supabase
    .from("audit_log")
    .select(
      `id, action, entity, entity_id, meta, created_at,
       actor:staff!audit_log_actor_fkey ( full_name, email )`,
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  const rows = (data ?? []) as unknown as AuditRow[];
  const total = count ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit log"
        description="Every issue, revocation, renewal and email. Read-only: nothing here can be edited."
      />

      <div className="overflow-hidden rounded-2xl border bg-card">
        {rows.length === 0 ? (
          <p className="px-6 py-14 text-center text-sm text-muted-foreground">
            Nothing recorded yet.
          </p>
        ) : (
          <ul className="divide-y">
            {rows.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3.5 transition-colors duration-150 hover:bg-muted/50 sm:px-5"
              >
                <span className="w-full font-mono text-xs sm:text-[13px] sm:w-56 sm:flex-none">
                  {row.action}
                </span>
                <span className="text-sm text-muted-foreground">
                  {row.actor?.full_name ?? row.actor?.email ?? "system"}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums sm:ml-auto">
                  {row.created_at.replace("T", " ").slice(0, 19)}
                </span>
                {row.entity_id ? (
                  <Link
                    href={`/dashboard/certificates/${row.entity_id}`}
                    className="font-mono text-xs underline-offset-4 hover:underline"
                  >
                    {row.entity_id.slice(0, 8)}
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      {pageCount > 1 ? (
        <nav aria-label="Pagination" className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Page {page} of {pageCount} · {total} entries
          </span>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/dashboard/audit?page=${Math.max(1, page - 1)}`}>
                Previous
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`/dashboard/audit?page=${Math.min(pageCount, page + 1)}`}>
                Next
              </Link>
            </Button>
          </div>
        </nav>
      ) : null}
    </div>
  );
}
