import type { Metadata } from "next";
import Link from "next/link";
import { ScanLauncher } from "@/components/scan-launcher";

export const metadata: Metadata = {
  title: "Scan a certificate",
  description: "Scan a certificate QR code to verify it.",
};

export default function ScanPage() {
  return (
    <main className="mx-auto max-w-lg px-6 py-12">
      <Link
        href="/"
        className="text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        ← Back
      </Link>

      <h1 className="mt-6 text-2xl font-semibold tracking-tight">
        Scan a certificate
      </h1>
      <p className="mt-2 text-sm text-muted-foreground text-pretty">
        Point your camera at the QR code printed on the certificate. Your
        browser will ask for camera permission, and the camera needs a secure
        connection (HTTPS or localhost).
      </p>

      <div className="mt-8">
        <ScanLauncher />
      </div>

      <p className="mt-8 text-sm text-muted-foreground">
        No camera?{" "}
        <Link href="/" className="underline underline-offset-4">
          Type the certificate ID instead
        </Link>
        .
      </p>
    </main>
  );
}
