import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/public-shell";
import { ScanLauncher } from "@/components/scan-launcher";

export const metadata: Metadata = {
  title: "Scan a certificate",
  description: "Scan a certificate QR code to verify it.",
};

export default function ScanPage() {
  return (
    <PublicShell width="max-w-4xl" className="pt-10 sm:pt-16">
      <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">← Back to verification</Link>
      <div className="mx-auto mt-8 max-w-2xl text-center">
        <p className="text-sm font-medium text-muted-foreground">Certificate verification</p>
        <h1 className="mt-3 text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">Scan a certificate.</h1>
        <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-muted-foreground">Point your camera at the certificate’s QR code to check its authenticity and current status.</p>
      </div>
      <div className="mx-auto mt-8 max-w-lg rounded-2xl border bg-card p-5 shadow-sm sm:p-7">
        <ScanLauncher featured />
        <p className="mt-5 text-center text-xs leading-relaxed text-muted-foreground">Allow camera access when prompted. If access is blocked, enable it in your browser’s site settings.</p>
      </div>
      <div className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-3 text-sm">
        <Link href="/verify" className="text-muted-foreground underline underline-offset-4 hover:text-foreground">Enter a certificate ID</Link>
        <Link href="/verify/upload" className="text-muted-foreground underline underline-offset-4 hover:text-foreground">Check a PDF instead</Link>
      </div>
    </PublicShell>
  );
}
