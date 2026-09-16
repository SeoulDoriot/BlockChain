import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Audit log</h1>
      <p className="mt-2 max-w-prose text-sm text-muted-foreground text-pretty">
        Every issue, revocation, renewal and email. Written with the service
        role and read-only here — no client can insert or edit these rows.
      </p>

      <div className="mt-6 overflow-x-auto">
        <Table>
          <caption className="sr-only">Audit log entries, newest first</caption>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Who</TableHead>
              <TableHead>Entity</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                  Nothing recorded yet.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="whitespace-nowrap tabular-nums text-xs">
                    {row.created_at.replace("T", " ").slice(0, 19)}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{row.action}</TableCell>
                  <TableCell className="text-xs">
                    {row.actor?.full_name ?? row.actor?.email ?? "system"}
                  </TableCell>
                  <TableCell className="font-mono text-xs break-all">
                    {row.entity_id ? (
                      <Link
                        href={`/dashboard/certificates/${row.entity_id}`}
                        className="underline-offset-4 hover:underline"
                      >
                        {row.entity_id.slice(0, 8)}…
                      </Link>
                    ) : (
                      row.entity
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pageCount > 1 ? (
        <nav aria-label="Pagination" className="mt-6 flex items-center justify-between">
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
    </>
  );
}
