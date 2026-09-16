import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { getCertificateForStaff } from "@/lib/data/certificates";
import { verifyCertificateById } from "@/lib/verify";
import { explorerTxUrl } from "@/lib/chain/client";
import { StatusSeal } from "@/components/status-seal";
import { CertificateActions } from "@/components/certificate-actions";
import { Button } from "@/components/ui/button";

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
    <div className="grid gap-1 border-b border-border/60 py-3 last:border-0 sm:grid-cols-[minmax(0,11rem)_1fr] sm:gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className={mono ? "font-mono text-sm break-all" : "text-sm"}>
        {children}
      </dd>
    </div>
  );
}

export default async function CertificateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { staff } = await requireStaff();

  const certificate = await getCertificateForStaff(id);
  if (!certificate) notFound();

  const verification = await verifyCertificateById(id);
  const canAct = staff.role === "admin" || staff.role === "issuer";

  return (
    <>
      <Link
        href="/dashboard/certificates"
        className="text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        ← Certificates
      </Link>

      <h1 className="mt-4 text-2xl font-semibold tracking-tight">
        {certificate.recipient_name}
      </h1>
      <p className="text-sm text-muted-foreground">
        {certificate.course
          ? `${certificate.course.code} — ${certificate.course.title}`
          : "No course"}
      </p>

      <div className="mt-6">
        <StatusSeal status={verification.status} />
      </div>

      <section className="mt-8" aria-labelledby="details-heading">
        <h2 id="details-heading" className="text-sm font-medium">
          Details
        </h2>
        <dl className="mt-2">
          <Field label="Recipient email">{certificate.recipient_email}</Field>
          <Field label="Issued on">{certificate.issued_on}</Field>
          <Field label="Expires">
            {certificate.expires_on ?? "Does not expire"}
          </Field>
          <Field label="Issued by">
            {certificate.issuer?.full_name ?? certificate.issuer?.email ?? "—"}
          </Field>
          {certificate.revoked_reason ? (
            <Field label="Revocation reason">{certificate.revoked_reason}</Field>
          ) : null}
          <Field label="Certificate ID" mono>
            {certificate.id}
          </Field>
        </dl>
      </section>

      <section className="mt-8" aria-labelledby="chain-heading">
        <h2 id="chain-heading" className="text-sm font-medium">
          Blockchain record
        </h2>
        <dl className="mt-2">
          <Field label="Certificate hash" mono>
            {certificate.cert_hash ?? "Not anchored"}
          </Field>
          <Field label="Transaction" mono>
            {certificate.tx_hash ? (
              <a
                className="underline underline-offset-4 hover:no-underline"
                href={explorerTxUrl(certificate.tx_hash)}
                target="_blank"
                rel="noopener noreferrer"
              >
                {certificate.tx_hash}
              </a>
            ) : (
              "—"
            )}
          </Field>
          <Field label="Anchored at">
            {verification.chain?.issuedAt
              ? verification.chain.issuedAt.toISOString().replace("T", " ").slice(0, 19) +
                " UTC"
              : "—"}
          </Field>
        </dl>
      </section>

      <div className="mt-8 flex flex-wrap gap-3">
        {certificate.pdf_path ? (
          <Button asChild variant="outline" size="sm">
            <a href={`/api/certificates/${certificate.id}/pdf`}>Download PDF</a>
          </Button>
        ) : null}
        <Button asChild variant="outline" size="sm">
          <Link href={`/verify/${certificate.id}`}>Public verify page</Link>
        </Button>
      </div>

      {canAct ? (
        <div className="mt-8 border-t pt-8">
          <CertificateActions
            certificateId={certificate.id}
            status={certificate.status}
            expiresOn={certificate.expires_on}
          />
        </div>
      ) : null}
    </>
  );
}
