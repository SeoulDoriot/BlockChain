import Link from "next/link";
import { ChevronRight, FileCheck2 } from "lucide-react";
import type { CertificateRow } from "@/lib/data/certificates";
import { cachedStatus } from "@/lib/status";
import { CopyButton } from "@/components/copy-button";
import { StatusBadge } from "@/components/status-badge";

export function shortId(id: string) {
  return id.slice(0, 8);
}

function certificateName(row: CertificateRow) {
  return row.course ? row.course.title : "—";
}

const TH = "whitespace-nowrap px-3 xl:px-4 py-3.5 text-left text-xs font-medium text-muted-foreground";
const TD = "px-3 xl:px-4 py-5 align-middle";

/**
 * Table on desktop, stacked cards on narrow screens. Deliberately plain
 * markup: thin row rules, no zebra, no heavy header.
 */
export function CertificateList({
  rows,
  variant,
  empty = "No certificates yet.",
}: {
  rows: CertificateRow[];
  variant: "recent" | "full";
  empty?: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="px-6 py-16 text-center"><span className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-secondary"><FileCheck2 className="size-6" strokeWidth={1.5} /></span><p className="text-sm font-medium">{empty}</p><p className="mt-2 text-xs text-muted-foreground">Issue a certificate or adjust your search to see records here.</p></div>
    );
  }

  const full = variant === "full";

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              {full ? <th className={`${TH} hidden xl:table-cell`}>Certificate ID</th> : null}
              <th className={TH}>Recipient</th>
              <th className={TH}>{full ? "Program" : "Certificate"}</th>
              {full ? null : <th className={TH}>Certificate ID</th>}
              <th className={TH}>{full ? "Issued" : "Issue Date"}</th>
              {full ? <th className={`${TH} hidden xl:table-cell`}>Expiration</th> : null}
              <th className={TH}>Status</th>
              <th className={`${TH} text-right`}>{full ? "Actions" : "Action"}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const id = (
                <td className={`${TD} font-mono text-xs text-muted-foreground ${full ? "hidden xl:table-cell" : ""}`} title={row.id}>
                  <span className="inline-flex items-center gap-1">
                    {shortId(row.id)}
                    <CopyButton value={row.id} label="Copy full certificate ID" />
                  </span>
                </td>
              );
              return (
                <tr
                  key={row.id}
                  className="border-b last:border-0 transition-colors duration-150 hover:bg-muted/50"
                >
                  {full ? id : null}
                  <td className={TD}>
                    <div className="flex items-center gap-3">
                      {full ? <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full border bg-secondary text-xs font-semibold">{row.recipient_name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</span> : null}
                      <div className="font-medium">{row.recipient_name}</div>
                    </div>
                    {full ? (
                      <div className="mt-1 pl-12 text-xs text-muted-foreground">{row.recipient_email}</div>
                    ) : null}
                  </td>
                  <td className={`${TD} text-muted-foreground`}>{certificateName(row)}</td>
                  {full ? null : id}
                  <td className={`${TD} whitespace-nowrap text-muted-foreground tabular-nums`}>
                    {row.issued_on}
                    {full ? (
                      <div className="text-xs xl:hidden">
                        {row.expires_on ? `Expires ${row.expires_on}` : "No expiry"}
                      </div>
                    ) : null}
                  </td>
                  {full ? (
                    <td className={`${TD} hidden whitespace-nowrap text-muted-foreground tabular-nums xl:table-cell`}>
                      {row.expires_on ?? "Never"}
                    </td>
                  ) : null}
                  <td className={TD}>
                    <StatusBadge status={cachedStatus(row.status, row.expires_on)} />
                  </td>
                  <td className={`${TD} text-right`}>
                    <Link
                      href={`/dashboard/certificates/${row.id}`}
                      className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors duration-150 hover:bg-secondary focus-visible:outline-2 focus-visible:outline-ring"
                    >
                      View <ChevronRight className="size-3.5" strokeWidth={1.75} />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ul className="divide-y md:hidden">
        {rows.map((row) => (
          <li key={row.id}>
            <Link
              href={`/dashboard/certificates/${row.id}`}
              className="flex items-start justify-between gap-3 px-4 py-4 transition-colors hover:bg-muted/50"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{row.recipient_name}</p>
                <p className="truncate text-sm text-muted-foreground">{certificateName(row)}</p>
                <p className="mt-1 flex flex-wrap gap-x-2 text-xs text-muted-foreground tabular-nums">
                  <span className="font-mono">{shortId(row.id)}</span>
                  <span>{row.issued_on}</span>
                  {full && row.expires_on ? <span>Expires {row.expires_on}</span> : null}
                </p>
              </div>
              <StatusBadge status={cachedStatus(row.status, row.expires_on)} className="shrink-0" />
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
