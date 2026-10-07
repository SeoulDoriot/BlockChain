import Link from "next/link";
import { Plus } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { getCertificateCounts, listCertificates } from "@/lib/data/certificates";
import { CertificateList } from "@/components/certificate-list";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";

/** Authenticated on every request, so this route is expected to block. */
export const instant = false;

function greeting(): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "numeric",
      hour12: false,
      timeZone: "Asia/Phnom_Penh",
    }).format(new Date()),
  );
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const { org } = await requireStaff();

  const [counts, recent] = await Promise.all([
    getCertificateCounts(),
    listCertificates({ pageSize: 6 }),
  ]);

  const stats = [
    { label: "Total certificates", value: counts.total, dot: "bg-foreground/30" },
    { label: "Active", value: counts.active, dot: "bg-[#2f9e66]" },
    { label: "Expired", value: counts.expired, dot: "bg-[#d9962b]" },
    { label: "Revoked", value: counts.revoked, dot: "bg-[#d4554a]" },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title={`${greeting()}, ${org.name}`}
        description="Here is where your certificates stand today."
        actions={
          <Button asChild>
            <Link href="/dashboard/certificates/new">
              <Plus strokeWidth={2} /> Issue Certificate
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border bg-card px-5 py-5">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className={`size-1.5 rounded-full ${stat.dot}`} aria-hidden="true" />
              {stat.label}
            </p>
            <p className="mt-3 text-4xl font-semibold tracking-tight tabular-nums">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <section aria-labelledby="recent-heading">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="recent-heading" className="text-base font-medium">
            Recent certificates
          </h2>
          <Link
            href="/dashboard/certificates"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            View all
          </Link>
        </div>
        <div className="overflow-hidden rounded-2xl border bg-card">
          <CertificateList rows={recent.rows} variant="recent" />
        </div>
      </section>
    </div>
  );
}
