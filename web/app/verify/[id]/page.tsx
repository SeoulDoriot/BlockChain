import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { StatusSeal } from "@/components/status-seal";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { verifyCertificateById } from "@/lib/verify";
import { explorerTxUrl } from "@/lib/chain/client";
import { env } from "@/lib/env";

export const metadata: Metadata = {
  title: "Verify certificate",
  description: "Check whether a certificate is genuine, expired or revoked.",
};

function Field({
  label,
  children,
  mono = false,
}: {
  label: string;
  children: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="grid gap-1 border-b border-border/60 py-3 last:border-0 sm:grid-cols-[minmax(0,10rem)_1fr] sm:gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className={mono ? "font-mono text-sm break-all" : "text-sm"}>
        {children}
      </dd>
    </div>
  );
}

async function VerificationResult({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // params is runtime data. Reading it inside Suspense keeps the surrounding
  // page prerenderable as a static shell.
  const { id } = await params;
  const result = await verifyCertificateById(id);

  if (!result.found || !result.certificate) {
    return (
      <>
        <StatusSeal status="not_found" />
        <p className="mt-6 text-sm text-muted-foreground">
          No certificate matches the identifier{" "}
          <span className="font-mono break-all">{id}</span>. Check it was copied
          in full.
        </p>
      </>
    );
  }

  const cert = result.certificate;

  return (
    <>
      <StatusSeal status={result.status} />

      {result.tampered ? (
        <p className="mt-4 rounded-lg border border-red-600/30 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-400/25 dark:bg-red-950/40 dark:text-red-100">
          The details stored for this certificate no longer match the
          fingerprint recorded on the blockchain. It has been altered since it
          was issued.
        </p>
      ) : null}

      <section className="mt-8" aria-labelledby="certificate-details">
        <h2 id="certificate-details" className="text-sm font-medium">
          Certificate
        </h2>
        <dl className="mt-2">
          <Field label="Recipient">{cert.recipient_name}</Field>
          <Field label="Course">
            {cert.course ? `${cert.course.code} — ${cert.course.title}` : "—"}
          </Field>
          <Field label="Issued by">{result.orgName ?? "—"}</Field>
          <Field label="Issued on">{cert.issued_on}</Field>
          <Field label="Expires">
            {cert.expires_on ?? "Does not expire"}
          </Field>
          {cert.revoked_reason ? (
            <Field label="Reason for revocation">{cert.revoked_reason}</Field>
          ) : null}
          <Field label="Certificate ID" mono>
            {cert.id}
          </Field>
        </dl>
      </section>

      <section className="mt-8" aria-labelledby="blockchain-details">
        <h2 id="blockchain-details" className="text-sm font-medium">
          Blockchain record
        </h2>
        <dl className="mt-2">
          <Field label="Anchored hash" mono>
            {cert.cert_hash ?? "Not anchored"}
          </Field>
          <Field label="Recomputed hash" mono>
            {result.computedHash ? (
              <span className={result.tampered ? "text-destructive" : undefined}>
                {result.computedHash} {result.tampered ? "✗ mismatch" : "✓ match"}
              </span>
            ) : (
              "—"
            )}
          </Field>
          <Field label="Transaction" mono>
            {cert.tx_hash ? (
              <a
                className="underline underline-offset-4 hover:no-underline"
                href={explorerTxUrl(cert.tx_hash)}
                target="_blank"
                rel="noopener noreferrer"
              >
                {cert.tx_hash}
              </a>
            ) : (
              "—"
            )}
          </Field>
          <Field label="Network">
            {cert.chain_id === 80002
              ? "Polygon Amoy (80002)"
              : (cert.chain_id ?? "—")}
          </Field>
          <Field label="Anchored at">
            {result.chain?.issuedAt
              ? result.chain.issuedAt.toISOString().replace("T", " ").slice(0, 19) + " UTC"
              : "—"}
          </Field>
          <Field label="Contract" mono>
            <a
              className="underline underline-offset-4 hover:no-underline"
              href={`${env.NEXT_PUBLIC_EXPLORER_URL}/address/${env.NEXT_PUBLIC_CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {env.NEXT_PUBLIC_CONTRACT_ADDRESS}
            </a>
          </Field>
        </dl>
      </section>
    </>
  );
}

function ResultSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-[86px] w-full rounded-xl" />
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-6 w-full" />
        ))}
      </div>
    </div>
  );
}

export default function VerifyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link
        href="/"
        className="text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        ← Verify another
      </Link>

      <h1 className="mt-6 text-2xl font-semibold tracking-tight">
        Verification result
      </h1>

      <div className="mt-6">
        <Suspense fallback={<ResultSkeleton />}>
          <VerificationResult params={params} />
        </Suspense>
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Button asChild variant="outline" size="sm">
          <Link href="/scan">Scan a QR code</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/verify/upload">Check a PDF</Link>
        </Button>
      </div>
    </main>
  );
}
