import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronDown, ChevronLeft, ExternalLink } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { getCertificateForStaff } from "@/lib/data/certificates";
import { verifyCertificateById } from "@/lib/verify";
import { resultKey } from "@/lib/status";
import { explorerAddressUrl, explorerTxUrl, getPublicClient } from "@/lib/chain/client";
import { qrDataUrl } from "@/lib/cert/qr";
import { signatureDataUrl } from "@/lib/cert/signatory";
import { env, isLocalChain } from "@/lib/env";
import { CertificateActions, CertificateToolbar } from "@/components/certificate-actions";
import { CertificatePreview } from "@/components/certificate-preview";
import { CopyButton } from "@/components/copy-button";
import { StatusBadge } from "@/components/status-badge";
import { PageHeader } from "@/components/page-header";
import type { Hex } from "viem";

/** Authenticated on every request, so this route is expected to block. */
export const instant = false;

export const metadata: Metadata = { title: "Certificate details" };

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
    <div className="grid gap-0.5 py-3 sm:grid-cols-[9rem_1fr] sm:gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className={mono ? "font-mono text-xs sm:text-[13px] break-all" : "text-sm"}>{children}</dd>
    </div>
  );
}

const NETWORKS: Record<number, string> = {
  80002: "Polygon Amoy",
  31337: "Local test network",
};

async function blockNumber(txHash: string | null): Promise<string> {
  if (!txHash) return "—";
  try {
    const receipt = await getPublicClient().getTransactionReceipt({ hash: txHash as Hex });
    return receipt.blockNumber.toLocaleString("en-US");
  } catch {
    return "—";
  }
}

export default async function CertificateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { staff, org } = await requireStaff();

  const certificate = await getCertificateForStaff(id);
  if (!certificate) notFound();

  const [verification, qrSrc, block, signatureSrc] = await Promise.all([
    verifyCertificateById(id),
    qrDataUrl(id),
    blockNumber(certificate.tx_hash),
    signatureDataUrl(certificate.signature_path),
  ]);
  const canAct = staff.role === "admin" || staff.role === "issuer";
  const contract = env.NEXT_PUBLIC_CONTRACT_ADDRESS;

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/dashboard/certificates"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="size-4" strokeWidth={1.75} /> Certificates
        </Link>
        <PageHeader
          className="mt-3"
          title={certificate.recipient_name}
          description={
            <span className="flex flex-wrap items-center gap-2">
              <span role="status">
                <StatusBadge status={resultKey(verification)} />
              </span>
              <span>{certificate.course?.title ?? "No program"}</span>
            </span>
          }
          actions={
            <CertificateToolbar
              certificateId={certificate.id}
              status={certificate.status}
              hasPdf={Boolean(certificate.pdf_path)}
              canAct={canAct}
            />
          }
        />
      </div>

      <CertificatePreview
        templateId={certificate.template_id}
        certificateTitle={certificate.certificate_title}
        description={certificate.description}
        orgName={org.name}
        recipientName={certificate.recipient_name}
        title={certificate.course?.title}
        issuedOn={certificate.issued_on}
        expiresOn={certificate.expires_on}
        certificateId={certificate.id}
        qrSrc={qrSrc}
        signatoryName={certificate.signatory_name}
        signatoryTitle={certificate.signatory_title}
        signatureSrc={signatureSrc}
        className="mx-auto max-w-3xl"
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <section className="rounded-2xl border bg-card px-6 py-3" aria-labelledby="details-heading">
          <h2 id="details-heading" className="pt-3 text-base font-medium">
            Details
          </h2>
          <dl className="divide-y">
            <Field label="Recipient">{certificate.recipient_name}</Field>
            <Field label="Email">{certificate.recipient_email}</Field>
            <Field label="Certificate">{certificate.course?.title ?? "—"}</Field>
            <Field label="Issuer">{org.name}</Field>
            <Field label="Certificate ID" mono>
              <span className="inline-flex items-center gap-1">
                {certificate.id}
                <CopyButton value={certificate.id} label="Copy certificate ID" />
              </span>
            </Field>
            <Field label="Issue date">{certificate.issued_on}</Field>
            <Field label="Expiration">{certificate.expires_on ?? "Does not expire"}</Field>
            {certificate.revoked_reason ? (
              <Field label="Revoked because">{certificate.revoked_reason}</Field>
            ) : null}
          </dl>
        </section>

        <div className="space-y-6">
          <details className="group rounded-2xl border bg-card" open={false}>
            <summary className="flex cursor-pointer list-none items-center justify-between px-6 py-4 [&::-webkit-details-marker]:hidden">
              <div>
                <h2 className="text-base font-medium">Blockchain Proof</h2>
                <p className="text-sm text-muted-foreground">
                  Independent record of this certificate.
                </p>
              </div>
              <ChevronDown
                className="size-4 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
                strokeWidth={1.75}
              />
            </summary>
            <dl className="divide-y border-t px-6">
              <Field label="Network">
                {certificate.chain_id ? (NETWORKS[certificate.chain_id] ?? certificate.chain_id) : "—"}
              </Field>
              <Field label="Transaction Hash" mono>
                {certificate.tx_hash ?? "—"}
              </Field>
              <Field label="Block Number">{block}</Field>
              <Field label="Smart Contract" mono>
                {contract}
              </Field>
              <Field label="Timestamp">
                {verification.chain?.issuedAt
                  ? verification.chain.issuedAt.toISOString().replace("T", " ").slice(0, 19) + " UTC"
                  : "—"}
              </Field>
              <Field label="Fingerprint" mono>
                {certificate.cert_hash ?? "Not recorded"}
              </Field>
            </dl>
            <div className="flex flex-wrap gap-4 border-t px-6 py-4 text-sm">
              {isLocalChain ? (
                <span className="text-muted-foreground">
                  Recorded on a local test network, which has no public explorer.
                </span>
              ) : null}
              {!isLocalChain && certificate.tx_hash ? (
                <a
                  className="inline-flex items-center gap-1 font-medium hover:text-muted-foreground"
                  href={explorerTxUrl(certificate.tx_hash)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View Transaction <ExternalLink className="size-3.5" strokeWidth={1.75} />
                </a>
              ) : null}
              {!isLocalChain ? (
              <a
                className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                href={explorerAddressUrl(contract)}
                target="_blank"
                rel="noopener noreferrer"
              >
                View contract <ExternalLink className="size-3.5" strokeWidth={1.75} />
              </a>
              ) : null}
            </div>
          </details>

          {canAct ? (
            <section className="rounded-2xl border bg-card px-6 py-5">
              <h2 className="mb-4 text-base font-medium">Manage</h2>
              <CertificateActions
                certificateId={certificate.id}
                status={certificate.status}
                expiresOn={certificate.expires_on}
              />
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
