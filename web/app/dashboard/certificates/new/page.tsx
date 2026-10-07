import type { Metadata } from "next";
import { requireIssuer } from "@/lib/auth";
import { listCourses } from "@/lib/data/reference";
import { IssueCertificateForm } from "@/components/issue-certificate-form";
import { PageHeader } from "@/components/page-header";
import { getOrgSignatory, signatureDataUrl } from "@/lib/cert/signatory";

/** Authenticated on every request, so this route is expected to block. */
export const instant = false;

export const metadata: Metadata = { title: "Issue Certificate" };

export default async function NewCertificatePage() {
  const { org, staff } = await requireIssuer();
  const courses = await listCourses(org.id);
  const signatory = await getOrgSignatory(org.id);
  const signatureSrc = await signatureDataUrl(signatory.path);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Issue Certificate"
        description="Fill in the details and check the preview. The recipient receives the PDF by email as soon as it is issued."
      />
      <IssueCertificateForm
        courses={courses}
        orgName={org.name}
        signatoryName={signatory.name}
        signatoryTitle={signatory.title}
        signatureSrc={signatureSrc}
        isAdmin={staff.role === "admin"}
      />
    </div>
  );
}
