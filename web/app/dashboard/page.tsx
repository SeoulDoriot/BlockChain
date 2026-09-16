import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { listCertificates } from "@/lib/data/certificates";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DashboardPage() {
  const { org } = await requireStaff();

  const [all, issued, revoked] = await Promise.all([
    listCertificates({ pageSize: 1 }),
    listCertificates({ pageSize: 1, status: "issued" }),
    listCertificates({ pageSize: 1, status: "revoked" }),
  ]);

  const stats = [
    { label: "Total certificates", value: all.total },
    { label: "Issued", value: issued.total },
    { label: "Revoked", value: revoked.total },
  ];

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
          <p className="text-sm text-muted-foreground">{org.name}</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/certificates/new">Issue a certificate</Link>
        </Button>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold tabular-nums">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
