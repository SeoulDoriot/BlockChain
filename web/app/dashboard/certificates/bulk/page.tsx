import type { Metadata } from "next";
import Link from "next/link";
import { requireIssuer } from "@/lib/auth";
import { listCourses } from "@/lib/data/reference";
import { ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { BulkIssue } from "@/components/bulk-issue";

export const metadata: Metadata = { title: "Bulk issue" };

/** Authenticated on every request, so this route is expected to block. */
export const instant = false;

export default async function BulkIssuePage() {
  const { org } = await requireIssuer();
  const courses = await listCourses(org.id);

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/dashboard/certificates"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="size-4" strokeWidth={1.75} /> Certificates
        </Link>
        <PageHeader
          className="mt-3"
          title="Bulk issue"
          description="Issue a whole cohort from a CSV. Each certificate is recorded in its own transaction, so a failure part way through leaves the earlier ones intact."
        />
      </div>
      <div className="rounded-2xl border bg-card p-5 sm:p-6">
        <BulkIssue courses={courses} />
      </div>
    </div>
  );
}
