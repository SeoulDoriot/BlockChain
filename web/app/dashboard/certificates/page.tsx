import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus, Search, FileCheck2 } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import {
  listCertificates,
  type SortKey,
  type StatusFilter,
} from "@/lib/data/certificates";
import { CertificateList } from "@/components/certificate-list";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";

/** Authenticated on every request, so this route is expected to block. */
export const instant = false;

export const metadata: Metadata = { title: "Certificates" };

const PAGE_SIZE = 15;

const FILTERS: { value: StatusFilter | ""; label: string }[] = [
  { value: "", label: "All statuses" },
  { value: "active", label: "Valid" },
  { value: "expired", label: "Expired" },
  { value: "revoked", label: "Revoked" },
  { value: "draft", label: "Draft" },
];

const SORTS: { value: SortKey; label: string }[] = [
  { value: "recent", label: "Recently added" },
  { value: "issued", label: "Issue date" },
  { value: "expires", label: "Expiration" },
  { value: "name", label: "Recipient A–Z" },
];

const CONTROL =
  "h-10 rounded-xl border border-input bg-card px-3 text-sm outline-none transition-colors duration-200 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40";

export default async function CertificatesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; q?: string; sort?: string }>;
}) {
  await requireStaff();
  const params = await searchParams;

  const page = Number.parseInt(params.page ?? "1", 10) || 1;
  const filter = FILTERS.find((f) => f.value && f.value === params.status)?.value as
    | StatusFilter
    | undefined;
  const sort = SORTS.find((s) => s.value === params.sort)?.value ?? "recent";

  const { rows, total } = await listCertificates({
    page,
    pageSize: PAGE_SIZE,
    filter,
    sort,
    search: params.q?.trim() || undefined,
  });

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function pageHref(target: number) {
    const query = new URLSearchParams();
    query.set("page", String(target));
    if (filter) query.set("status", filter);
    if (params.q) query.set("q", params.q);
    if (sort !== "recent") query.set("sort", sort);
    return `/dashboard/certificates?${query.toString()}`;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Certificates"
        description={`${total} ${total === 1 ? "certificate" : "certificates"} issued by your organization.`}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/dashboard/certificates/bulk">Bulk issue</Link>
            </Button>
            <Button asChild>
              <Link href="/dashboard/certificates/new">
                <Plus strokeWidth={2} /> Issue Certificate
              </Link>
            </Button>
          </>
        }
      />

      <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-5 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-secondary"><FileCheck2 className="size-5" strokeWidth={1.75} /></span>
            <div><h2 className="text-sm font-semibold">Certificate directory</h2><p className="mt-0.5 text-xs text-muted-foreground">Find, review, and manage issued credentials.</p></div>
          </div>
          <span className="rounded-full border bg-muted/30 px-3 py-1 text-xs font-medium tabular-nums">{total} {total === 1 ? "record" : "records"}</span>
        </div>
      <form className="flex flex-wrap gap-3 border-b bg-muted/20 p-5 sm:px-6" role="search">
        <div className="relative w-full min-w-52 flex-1 sm:w-auto">
          <label htmlFor="q" className="sr-only">
            Search by recipient name or email
          </label>
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            strokeWidth={1.75}
          />
          <input
            id="q"
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="Search by recipient name or email…"
            className={`${CONTROL} w-full pl-9`}
          />
        </div>
        <label htmlFor="status" className="sr-only">
          Filter by status
        </label>
        <select id="status" name="status" defaultValue={filter ?? ""} className={`${CONTROL} min-w-0 flex-1 sm:flex-none`}>
          {FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <label htmlFor="sort" className="sr-only">
          Sort by
        </label>
        <select id="sort" name="sort" defaultValue={sort} className={`${CONTROL} min-w-0 flex-1 sm:flex-none`}>
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <Button type="submit" variant="outline" className="w-full sm:w-auto">
          Apply
        </Button>
        {params.q || filter || sort !== "recent" ? <Link href="/dashboard/certificates" className="inline-flex h-10 items-center px-2 text-sm text-muted-foreground hover:text-foreground">Clear filters</Link> : null}
      </form>

      <div>
        <CertificateList
          rows={rows}
          variant="full"
          empty={params.q || filter ? "No certificates match your filters." : "No certificates yet."}
        />
      </div>

      <div className="border-t px-5 py-4 sm:px-6">
      {pageCount > 1 ? (
        <nav aria-label="Pagination" className="flex items-center justify-between gap-4">
          <span className="text-sm text-muted-foreground">
            Page {page} of {pageCount}
          </span>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm" aria-disabled={page <= 1} className={page <= 1 ? "pointer-events-none opacity-50" : ""}>
              <Link href={pageHref(Math.max(1, page - 1))}>
                <ChevronLeft /> Previous
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" aria-disabled={page >= pageCount} className={page >= pageCount ? "pointer-events-none opacity-50" : ""}>
              <Link href={pageHref(Math.min(pageCount, page + 1))}>
                Next <ChevronRight />
              </Link>
            </Button>
          </div>
        </nav>
      ) : <p className="text-xs text-muted-foreground">{total === 0 ? "No records to display" : `Showing ${rows.length} of ${total} certificates`}</p>}
      </div>
      </section>
    </div>
  );
}
