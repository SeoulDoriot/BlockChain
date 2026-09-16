import type { Metadata } from "next";
import Link from "next/link";
import { PdfTamperCheck } from "@/components/pdf-tamper-check";

export const metadata: Metadata = {
  title: "Check a PDF",
  description: "Upload a certificate PDF to check whether it has been altered.",
};

export default function VerifyUploadPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link
        href="/"
        className="text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        ← Back
      </Link>

      <h1 className="mt-6 text-2xl font-semibold tracking-tight">
        Check a PDF for tampering
      </h1>
      <p className="mt-2 max-w-prose text-sm text-muted-foreground text-pretty">
        Upload a certificate PDF. We fingerprint the file and compare it to what
        we issued. If a single byte has changed, there will be no match.
      </p>

      <div className="mt-8">
        <PdfTamperCheck />
      </div>
    </main>
  );
}
