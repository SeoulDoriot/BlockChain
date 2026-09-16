import type { Metadata } from "next";
import Link from "next/link";
import { requireIssuer } from "@/lib/auth";
import { listCourses } from "@/lib/data/reference";
import { IssueCertificateForm } from "@/components/issue-certificate-form";

export const metadata: Metadata = { title: "Issue a certificate" };

export default async function NewCertificatePage() {
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
        Issue a certificate
      </h1>
      <p className="mt-2 max-w-prose text-sm text-muted-foreground text-pretty">
        The certificate is anchored on the blockchain before the PDF is
        generated, so this takes a few seconds. The recipient is emailed
        automatically.
      </p>

      <div className="mt-8 max-w-xl">
        <IssueCertificateForm courses={courses} />
      </div>
    </>
  );
}
