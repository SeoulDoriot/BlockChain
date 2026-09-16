import Link from "next/link";
import { Button } from "@/components/ui/button";
import { VerifyByIdForm } from "@/components/verify-by-id-form";

/**
 * Landing page. A Server Component with no client JavaScript beyond the small
 * form island, so it prerenders as a static shell.
 */
export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center px-6 py-16">
      <div className="space-y-3">
        <p className="text-sm font-medium text-muted-foreground">
          Kirirom Institute of Technology
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Certificate verification
        </h1>
        <p className="max-w-prose text-lg text-muted-foreground text-pretty">
          Every certificate issued here is anchored on the Polygon blockchain.
          Change one character of a certificate and it stops verifying. Checking
          one is free and needs no account.
        </p>
      </div>

      <div className="mt-10">
        <VerifyByIdForm />
      </div>

      <div className="mt-10 flex flex-wrap items-center gap-3">
        <Button asChild variant="outline">
          <Link href="/scan">Scan a QR code</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/verify/upload">Check a PDF for tampering</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/login">Staff sign in</Link>
        </Button>
      </div>
    </main>
  );
}
