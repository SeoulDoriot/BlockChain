import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronDown, ChevronLeft, ExternalLink } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { verifyCertificateById } from "@/lib/verify";
import { resultKey } from "@/lib/status";
import { env, isLocalChain } from "@/lib/env";
import { explorerTxUrl } from "@/lib/chain/client";
import { createClient } from "@/lib/supabase/server";
import { extractCertificateId, parseIdPrefix, prefixRange, safeDecode } from "@/lib/cert-id";
import { CopyButton } from "@/components/copy-button";
import { StatusSeal } from "@/components/status-seal";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Verification result" };

/** Authenticated on every request, so this route is expected to block. */
export const instant = false;

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
    <div className="grid gap-0.5 py-3 sm:grid-cols-[10rem_1fr] sm:gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className={mono ? "font-mono text-xs break-all sm:text-[13px]" : "text-sm"}>{children}</dd>
    </div>
  );
}

export default async function DashboardVerifyResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireStaff();
  const { id: rawId } = await params;
  const raw = safeDecode(rawId).trim();

  // A pasted link, stray spaces or capitals: go to the clean address.
  const clean = extractCertificateId(raw);
  if (clean && clean !== rawId) redirect(`/dashboard/verify/${clean}`);

  // The short form the certificates table shows. Staff only, and scoped to
  // their own organisation by row-level security.
  let ambiguous = false;
  if (!clean) {
    const prefix = parseIdPrefix(raw);
    if (prefix) {
      const { low, high } = prefixRange(prefix);
      const supabase = await createClient();
      const { data } = await supabase
        .from("certificates")
        .select("id")
        .gte("id", low)
        .lte("id", high)
        .limit(2);
      if (data?.length === 1) redirect(`/dashboard/verify/${data[0]!.id}`);
      ambiguous = (data?.length ?? 0) > 1;
    }
  }

  const id = rawId;
  const result = await verifyCertificateById(id);
  const cert = result.certificate;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <Link
        href="/dashboard/verify"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="size-4" strokeWidth={1.75} /> Verification
      </Link>

      {!result.found || !cert ? (
        <>
          <StatusSeal status="not_found" heading="h1" />
          <p className="text-center text-sm text-muted-foreground">
            No certificate matches <span className="font-mono break-all">{raw}</span>.
          </p>
          <p className="mx-auto max-w-md text-center text-sm text-muted-foreground text-pretty">
            {ambiguous
              ? "More than one certificate starts with those characters. Add a few more, or use the full ID."
              : "Enter the full 36-character ID or paste the verify link. In the certificates list, open a certificate and use the copy button next to its ID."}
          </p>
        </>
      ) : (
        <>
          <StatusSeal status={resultKey(result)} tampered={result.tampered} heading="h1" />

          <section className="rounded-2xl border bg-card px-6 py-2">
            <dl className="divide-y">
              <Field label="Recipient">{cert.recipient_name}</Field>
              <Field label="Certificate / Program">{cert.course?.title ?? "—"}</Field>
              <Field label="Issuing Organization">{result.orgName ?? "—"}</Field>
              <Field label="Certificate ID" mono>
                <span className="inline-flex items-center gap-1">
                  {cert.id}
                  <CopyButton value={cert.id} label="Copy certificate ID" />
                </span>
              </Field>
              <Field label="Issue date">{cert.issued_on}</Field>
              <Field label="Expiration">{cert.expires_on ?? "Does not expire"}</Field>
              {cert.revoked_reason ? (
                <Field label="Revoked because">{cert.revoked_reason}</Field>
              ) : null}
            </dl>
          </section>

          <details className="group rounded-2xl border bg-card">
            <summary className="flex cursor-pointer list-none items-center justify-between px-6 py-4 text-base font-medium [&::-webkit-details-marker]:hidden">
              Blockchain Proof
              <ChevronDown
                className="size-4 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
                strokeWidth={1.75}
              />
            </summary>
            <dl className="divide-y border-t px-6">
              <Field label="Network">
                {cert.chain_id === 80002
                  ? "Polygon Amoy"
                  : cert.chain_id === 31337
                    ? "Local test network"
                    : (cert.chain_id ?? "—")}
              </Field>
              <Field label="Transaction" mono>
                {cert.tx_hash ?? "—"}
              </Field>
              <Field label="Smart contract" mono>
                {env.NEXT_PUBLIC_CONTRACT_ADDRESS}
              </Field>
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
            </dl>
            {!isLocalChain && cert.tx_hash ? (
              <div className="border-t px-6 py-4 text-sm">
                <a
                  className="inline-flex items-center gap-1 font-medium hover:text-muted-foreground"
                  href={explorerTxUrl(cert.tx_hash)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View Transaction <ExternalLink className="size-3.5" strokeWidth={1.75} />
                </a>
              </div>
            ) : null}
          </details>

          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href={`/dashboard/certificates/${cert.id}`}>Open in certificates</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href={`/verify/${cert.id}`}>View public page</Link>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
