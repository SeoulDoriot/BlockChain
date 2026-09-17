import type { Metadata } from "next";
import Link from "next/link";
import { requireIssuer } from "@/lib/auth";
import { listCourses } from "@/lib/data/reference";
import { BulkIssue } from "@/components/bulk-issue";

export const metadata: Metadata = { title: "Bulk issue" };

export default async function BulkIssuePage() {
  const { org } = await requireIssuer();
  const courses = await listCourses(org.id);

  return (
    <>
      <Link
        href="/dashboard/certificates"
        className="text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        ← Certificates
      </Link>

      <h1 className="mt-4 text-2xl font-semibold tracking-tight">
        Bulk issue from a CSV
      </h1>
      <p className="mt-2 max-w-prose text-sm text-muted-foreground text-pretty">
        Issue a whole cohort in one go. Each certificate is anchored on the
        blockchain in its own transaction, one after another, so a failure part
        way through leaves the earlier ones intact and safe to keep.
      </p>

      <div className="mt-8">
        <BulkIssue courses={courses} />
      </div>
    </>
  );
}
