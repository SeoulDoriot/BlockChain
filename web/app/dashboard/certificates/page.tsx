import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { listCertificates } from "@/lib/data/certificates";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { deriveStatus, STATUS_LABELS } from "@/lib/status";

const PAGE_SIZE = 20;

export default async function CertificatesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; q?: string }>;
}) {
  await requireStaff();
  const params = await searchParams;

  const page = Number.parseInt(params.page ?? "1", 10) || 1;
  const status =
    params.status === "draft" || params.status === "issued" || params.status === "revoked"
      ? params.status
      : undefined;

  const { rows, total } = await listCertificates({
    page,
    pageSize: PAGE_SIZE,
    status,
    search: params.q,
  });

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function pageHref(target: number) {
    const query = new URLSearchParams();
    query.set("page", String(target));
    if (status) query.set("status", status);
    if (params.q) query.set("q", params.q);
    return `/dashboard/certificates?${query.toString()}`;
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Certificates</h1>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/certificates/bulk">Bulk issue</Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/certificates/new">Issue a certificate</Link>
          </Button>
        </div>
      </div>

      <form className="mt-6 flex flex-wrap gap-2" role="search">
        <label htmlFor="q" className="sr-only">
          Search by recipient name or email
        </label>
        <input
          id="q"
          name="q"
          defaultValue={params.q ?? ""}
          placeholder="Search recipient…"
          className="h-9 flex-1 min-w-48 rounded-md border bg-transparent px-3 text-sm"
        />
        <label htmlFor="status" className="sr-only">
          Filter by status
        </label>
        <select
          id="status"
          name="status"
          defaultValue={status ?? ""}
          className="h-9 rounded-md border bg-transparent px-3 text-sm"
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="issued">Issued</option>
          <option value="revoked">Revoked</option>
        </select>
        <Button type="submit" variant="outline" size="sm">
          Filter
        </Button>
      </form>

      <div className="mt-6 overflow-x-auto">
        <Table>
          <caption className="sr-only">
            Certificates issued by your organisation, newest first
          </caption>
          <TableHeader>
            <TableRow>
              <TableHead>Recipient</TableHead>
              <TableHead>Course</TableHead>
              <TableHead>Issued</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  No certificates yet.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => {
                const display = deriveStatus({
                  chainStatus: null,
                  rowStatus: row.status,
                  expiresOn: row.expires_on,
                });
                return (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="font-medium">{row.recipient_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {row.recipient_email}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {row.course ? row.course.code : "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap tabular-nums">
                      {row.issued_on}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          row.status === "revoked"
                            ? "destructive"
                            : row.status === "draft"
                              ? "outline"
                              : "secondary"
                        }
                      >
                        {row.status === "issued"
                          ? STATUS_LABELS[display]
                          : STATUS_LABELS[display]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/dashboard/certificates/${row.id}`}
                        className="text-sm underline-offset-4 hover:underline"
                      >
                        View
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {pageCount > 1 ? (
        <nav
          aria-label="Pagination"
          className="mt-6 flex items-center justify-between gap-4"
        >
          <span className="text-sm text-muted-foreground">
            Page {page} of {pageCount} · {total} total
          </span>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm" disabled={page <= 1}>
              <Link href={pageHref(Math.max(1, page - 1))}>Previous</Link>
            </Button>
            <Button asChild variant="outline" size="sm" disabled={page >= pageCount}>
              <Link href={pageHref(Math.min(pageCount, page + 1))}>Next</Link>
            </Button>
          </div>
        </nav>
      ) : null}
    </>
  );
}
