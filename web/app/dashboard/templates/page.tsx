import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { CertificatePreview } from "@/components/certificate-preview";
import { PageHeader } from "@/components/page-header";
import { getOrgSignatory, signatureDataUrl } from "@/lib/cert/signatory";

/** Authenticated on every request, so this route is expected to block. */
export const instant = false;

export const metadata: Metadata = { title: "Templates" };

export default async function TemplatesPage() {
  const { org } = await requireStaff();
  const signatory = await getOrgSignatory(org.id);
  const signatureSrc = await signatureDataUrl(signatory.path);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Templates"
        description="Preview how certificates look before they are issued. The same design is used for the PDF."
      />

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-medium">KIT — Red institutional</h2>
            <p className="text-sm text-muted-foreground">School artwork with a live text overlay, signature, and verification QR code.</p>
          </div>
          <Link href="/dashboard/certificates/new" className="shrink-0 text-sm font-medium underline underline-offset-4">Create certificate</Link>
        </div>
        <CertificatePreview
          templateId="kit-red"
          orgName={org.name}
          recipientName="Sokha Chan"
          title="Introduction to Software Engineering"
          issuedOn="2026-06-30"
          expiresOn={null}
          certificateId="3f1a7b2c-8d4e-4f60-9a1b-2c3d4e5f6071"
          signatoryName={signatory.name}
          signatoryTitle={signatory.title}
          signatureSrc={signatureSrc}
        />

        <p className="text-sm text-muted-foreground">Sample details shown. Enter the recipient and course details on the creation page to see your certificate.</p>
      </div>
      <div className="space-y-4">
        <h2 className="text-lg font-medium">Classic — Minimal</h2>
        <CertificatePreview templateId="classic" orgName={org.name}
          recipientName="Sokha Chan" title="Introduction to Software Engineering"
          issuedOn="2026-10-04" signatureSrc={signatureSrc}
          signatoryName={signatory.name} signatoryTitle={signatory.title} />
      </div>
    </div>
  );
}
