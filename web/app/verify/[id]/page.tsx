import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { extractCertificateId, safeDecode } from "@/lib/cert-id";
import Link from "next/link";
import { ChevronDown, ScanLine } from "lucide-react";
import { StatusSeal } from "@/components/status-seal";
import { Button } from "@/components/ui/button";
import { verifyCertificateById } from "@/lib/verify";
import { resultKey } from "@/lib/status";
import { explorerTxUrl } from "@/lib/chain/client";
import { isLocalChain } from "@/lib/env";
import { env } from "@/lib/env";
import { getDictionary } from "@/lib/i18n";
import { LocaleToggle } from "@/components/locale-toggle";
import { PublicShell } from "@/components/public-shell";
import { ShareCertificate } from "@/components/share-certificate";

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
    <div className="grid gap-0.5 py-3 sm:grid-cols-[minmax(0,10rem)_1fr] sm:gap-4">
      <dt className="text-[15px] text-muted-foreground">{label}</dt>
      <dd className={mono ? "font-mono text-xs sm:text-sm break-all" : "text-base"}>
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
  const [result, { t }] = await Promise.all([
    verifyCertificateById(id),
    getDictionary(),
  ]);

  if (!result.found || !result.certificate) {
    return (
      <>
        <StatusSeal status="not_found" labels={t.status} heading="h1" />
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {t.noMatch}{" "}
          <span className="font-mono break-all">{safeDecode(id)}</span>
        </p>
        <p className="mx-auto mt-3 max-w-md text-center text-sm text-muted-foreground text-pretty">
          {t.idHint}
        </p>
      </>
    );
  }

  const cert = result.certificate;

  return (
    <>
      <StatusSeal status={resultKey(result)} labels={t.status} heading="h1" />

      {result.tampered ? (
        <p className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {t.tamperedWarning}
        </p>
      ) : null}

      <section
        className="mt-10 rounded-2xl border bg-card px-6 py-2"
        aria-labelledby="certificate-details"
      >
        <h2 id="certificate-details" className="sr-only">
          {t.certificateDetails}
        </h2>
        <dl className="divide-y">
          <Field label={t.recipient}>{cert.recipient_name}</Field>
          <Field label={t.programLabel}>
            {cert.course ? cert.course.title : "—"}
          </Field>
          <Field label={t.issuingOrganization}>{result.orgName ?? "—"}</Field>
          <Field label={t.certificateId} mono>
            {cert.id}
          </Field>
          <Field label={t.issuedOn}>{cert.issued_on}</Field>
          <Field label={t.expires}>{cert.expires_on ?? t.doesNotExpire}</Field>
          {cert.revoked_reason ? (
            <Field label={t.revocationReason}>{cert.revoked_reason}</Field>
          ) : null}
        </dl>
      </section>

      <details className="group mt-4 rounded-2xl border bg-card">
        <summary className="flex cursor-pointer list-none items-center justify-between px-6 py-5 text-base font-medium [&::-webkit-details-marker]:hidden">
          {t.blockchainProof}
          <ChevronDown
            className="size-4 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
            strokeWidth={1.75}
          />
        </summary>
        <dl className="divide-y border-t px-6">
          <Field label={t.network}>
            {cert.chain_id === 80002
              ? "Polygon Amoy"
              : cert.chain_id === 31337
                ? "Local test network"
                : (cert.chain_id ?? "—")}
          </Field>
          <Field label={t.transaction} mono>
            {cert.tx_hash ? (
              isLocalChain ? (
                cert.tx_hash
              ) : (
                <a
                  className="underline underline-offset-4 hover:no-underline"
                  href={explorerTxUrl(cert.tx_hash)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {cert.tx_hash}
                </a>
              )
            ) : (
              "—"
            )}
          </Field>
          <Field label={t.anchoredAt}>
            {result.chain?.issuedAt
              ? result.chain.issuedAt.toISOString().replace("T", " ").slice(0, 19) + " UTC"
              : "—"}
          </Field>
          <Field label={t.contract} mono>
            {isLocalChain ? (
              env.NEXT_PUBLIC_CONTRACT_ADDRESS
            ) : (
              <a
                className="underline underline-offset-4 hover:no-underline"
                href={`${env.NEXT_PUBLIC_EXPLORER_URL}/address/${env.NEXT_PUBLIC_CONTRACT_ADDRESS}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {env.NEXT_PUBLIC_CONTRACT_ADDRESS}
              </a>
            )}
          </Field>
          <Field label={t.anchoredHash} mono>
            {cert.cert_hash ?? t.notAnchored}
          </Field>
          <Field label={t.recomputedHash} mono>
            {result.computedHash ? (
              <span className={result.tampered ? "text-destructive" : undefined}>
                {result.computedHash} {result.tampered ? t.mismatch : t.match}
              </span>
            ) : (
              "—"
            )}
          </Field>
        </dl>
      </details>
      <div className="mt-6">
        <ShareCertificate
          verifyUrl={`${env.NEXT_PUBLIC_APP_URL}/verify/${cert.id}`}
          certificateId={cert.id}
          courseTitle={cert.course?.title ?? "Certificate"}
          orgName={result.orgName ?? ""}
          issuedOn={cert.issued_on}
          expiresOn={cert.expires_on}
          labels={{
            addToLinkedIn: t.addToLinkedIn,
            share: t.share,
            copy: t.copy,
            copied: t.copied,
          }}
        />
      </div>
    </>
  );
}

async function PageFooter({ signedIn }: { signedIn: boolean }) {
  const { t } = await getDictionary();
  // Staff stay inside the dashboard; visitors use the public pages.
  const verifyHref = signedIn ? "/dashboard/verify" : "/verify";
  return (
    <div className="mt-10 flex flex-wrap justify-center gap-2">
      <Button asChild variant="outline">
        <Link href={verifyHref}>{t.verifyAnother.replace("← ", "")}</Link>
      </Button>
      <Button asChild variant="ghost">
        <Link href={signedIn ? "/dashboard/verify" : "/scan"}>
          <ScanLine strokeWidth={1.75} /> {t.scanQr}
        </Link>
      </Button>
      <Button asChild variant="ghost">
        <Link href={signedIn ? "/dashboard/verify" : "/verify/upload"}>{t.checkPdf}</Link>
      </Button>
    </div>
  );
}

async function LocaleSwitch({ id }: { id: string }) {
  const { locale } = await getDictionary();
  return <LocaleToggle locale={locale} from={`/verify/${id}`} />;
}

/**
 * This page renders blocking rather than streaming.
 *
 * React delivers streamed content inside a <template> that only JavaScript can
 * swap in, so a Suspense boundary would leave a visitor with scripting
 * disabled looking at a skeleton instead of a verification result — on the one
 * page that must work everywhere, for anyone, with no account and no
 * assumptions about their browser.
 *
 * It costs nothing: measured against the streaming version, blocking scored
 * 97 vs 95 on Lighthouse with a lower LCP, because the result arrives in the
 * first paint instead of after a round trip.
 */
export const instant = false;

export default async function VerifyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // A pasted link, stray spaces or capitals: send them to the clean address.
  const clean = extractCertificateId(id);
  if (clean && clean !== id) redirect(`/verify/${clean}`);

  const signedIn = (await headers()).get("x-signed-in") === "1";
  return (
    <PublicShell
      width="max-w-3xl"
      signedIn={signedIn}
      actions={<LocaleSwitch id={encodeURIComponent(id)} />}
    >
      <div className="pt-6">
        <VerificationResult params={params} />
      </div>
      <PageFooter signedIn={signedIn} />
    </PublicShell>
  );
}
