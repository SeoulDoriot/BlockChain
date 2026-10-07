import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/public-shell";
import { PdfTamperCheck } from "@/components/pdf-tamper-check";

export const metadata: Metadata = {
  title: "Check a PDF",
  description: "Upload a certificate PDF to check whether it has been altered.",
};

export default function VerifyUploadPage() {
  return (
    <PublicShell width="max-w-4xl" className="pt-10 sm:pt-16">
      <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">← Back to verification</Link>
      <div className="mx-auto mt-8 max-w-2xl text-center">
        <p className="text-sm font-medium text-muted-foreground">Certificate verification</p>
        <h1 className="mt-3 text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">Check your certificate PDF.</h1>
        <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-muted-foreground">Find out whether your PDF matches the original certificate issued through our platform.</p>
      </div>
      <div className="mt-8 rounded-2xl border bg-card p-5 shadow-sm sm:p-7">
        <PdfTamperCheck />
      </div>
      <div className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-3 text-sm">
        <Link href="/verify" className="text-muted-foreground underline underline-offset-4 hover:text-foreground">Enter a certificate ID</Link>
        <Link href="/scan" className="text-muted-foreground underline underline-offset-4 hover:text-foreground">Scan a QR code instead</Link>
      </div>
    </PublicShell>
  );
}
