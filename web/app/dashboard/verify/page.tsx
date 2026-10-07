import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { PdfTamperCheck } from "@/components/pdf-tamper-check";
import { ScanLauncher } from "@/components/scan-launcher";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Verification" };

/** Authenticated on every request, so this route is expected to block. */
export const instant = false;

function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-card p-6">
      <h2 className="text-base font-medium">{title}</h2>
      <p className="mt-1 mb-5 text-sm text-muted-foreground text-pretty">{description}</p>
      {children}
    </section>
  );
}

export default async function DashboardVerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  await requireStaff();
  const { id } = await searchParams;
  const trimmed = id?.trim();
  if (trimmed) redirect(`/dashboard/verify/${encodeURIComponent(trimmed)}`);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Verification"
        description="Check any certificate without leaving your workspace."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel
          title="Certificate ID"
          description="Printed on the certificate, under the QR code."
        >
          <form method="get" className="flex flex-col gap-3 sm:flex-row">
            <label htmlFor="verify-id" className="sr-only">
              Certificate ID
            </label>
            <input
              id="verify-id"
              name="id"
              required
              autoComplete="off"
              spellCheck={false}
              placeholder="Enter Certificate ID"
              className="h-10 min-w-0 flex-1 rounded-xl border border-input bg-card px-3 font-mono text-sm outline-none transition-colors duration-200 placeholder:font-sans focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
            />
            <Button type="submit">Verify</Button>
          </form>
        </Panel>

        <Panel title="Scan QR code" description="Use your camera to scan the code on a certificate.">
          <ScanLauncher resultBase="/dashboard/verify" />
        </Panel>
      </div>

      <Panel
        title="Check a PDF"
        description="Upload a certificate PDF to see whether it has been altered since it was issued."
      >
        <PdfTamperCheck resultBase="/dashboard/verify" />
      </Panel>
    </div>
  );
}
