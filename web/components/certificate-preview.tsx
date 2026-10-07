import { cn } from "@/lib/utils";
import { KitCertificatePreview } from "@/components/kit-certificate-preview";
import type { CertificateTemplate } from "@/lib/cert/template-layout";

export interface CertificatePreviewProps {
  templateId?: CertificateTemplate;
  certificateTitle?: string;
  description?: string;
  orgName: string;
  recipientName?: string;
  title?: string;
  issuedOn?: string;
  expiresOn?: string | null;
  certificateId?: string;
  /** Data URL of the real QR code. Without it a neutral placeholder is drawn. */
  qrSrc?: string;
  /** Who signs. Without a name the line reads "Authorised signature". */
  signatoryName?: string | null;
  signatoryTitle?: string | null;
  /** Data URL of the signature image, if one was uploaded. */
  signatureSrc?: string;
  className?: string;
}

// A fixed pseudo-QR so the live preview has the right visual weight.
const PLACEHOLDER = (() => {
  const cells: string[] = [];
  let seed = 7;
  for (let y = 0; y < 21; y++) {
    for (let x = 0; x < 21; x++) {
      const finder =
        (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13);
      if (finder) continue;
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      if (seed % 5 < 2) cells.push(`M${x} ${y}h1v1h-1z`);
    }
  }
  const finders = [
    [0, 0],
    [14, 0],
    [0, 14],
  ]
    .map(([x, y]) => `M${x} ${y}h7v7h-7zM${x! + 1} ${y! + 1}v5h5v-5zM${x! + 2} ${y! + 2}h3v3h-3z`)
    .join("");
  return cells.join("") + finders;
})();

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * The certificate as a calm, typographic page. Sized in container-query units
 * so one component serves the live form preview, the details page and the
 * template gallery at any width.
 */
export function CertificatePreview({
  templateId = "kit-red",
  certificateTitle,
  description,
  orgName,
  recipientName,
  title,
  issuedOn,
  expiresOn,
  certificateId,
  qrSrc,
  signatoryName,
  signatoryTitle,
  signatureSrc,
  className,
}: CertificatePreviewProps) {
  if (templateId === "kit-red") return <KitCertificatePreview {...{
    orgName, recipientName, title, issuedOn, expiresOn, certificateId, qrSrc,
    signatoryName, signatoryTitle, signatureSrc, className, certificateTitle, description,
  }} />;
  return (
    <div
      className={cn("@container w-full", className)}
      role="img"
      aria-label={`Certificate preview for ${recipientName || "recipient"}`}
    >
      <div className="relative aspect-[1.414/1] w-full overflow-hidden rounded-[1.2cqw] border border-border bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="absolute inset-[3cqw] flex flex-col rounded-[0.6cqw] border border-[#ececec] px-[6cqw] py-[4.5cqw] text-center">
          <p className="text-[1.5cqw] font-medium tracking-[0.28em] text-[#6e6e73] uppercase">
            {orgName}
          </p>

          <div className="flex flex-1 flex-col items-center justify-center">
            <p className="text-[1.6cqw] text-[#6e6e73]">{certificateTitle || "Certificate of Completion"}</p>
            <p className="mt-[1.6cqw] max-w-full truncate text-[5.2cqw] leading-tight font-semibold tracking-tight text-[#1d1d1f]">
              {recipientName || "Recipient name"}
            </p>
            <p className="mt-[1.4cqw] text-[1.6cqw] text-[#6e6e73]">{description || "has successfully completed"}</p>
            <p className="mt-[0.8cqw] max-w-[80%] truncate text-[2.4cqw] font-medium text-[#1d1d1f]">
              {title || "Certificate title"}
            </p>
          </div>

          <div className="flex items-end justify-between gap-[3cqw] text-left">
            <div className="w-[26%]">
              {signatureSrc ? (
                // eslint-disable-next-line @next/next/no-img-element -- data URL
                <img src={signatureSrc} alt="" className="mb-[0.4cqw] h-[4.2cqw] max-w-full object-contain object-left" />
              ) : null}
              <div className="h-px w-full bg-[#1d1d1f]/60" />
              {signatoryName ? (
                <>
                  <p className="mt-[0.7cqw] truncate text-[1.25cqw] font-medium text-[#1d1d1f]">
                    {signatoryName}
                  </p>
                  {signatoryTitle ? (
                    <p className="truncate text-[1.05cqw] text-[#6e6e73]">{signatoryTitle}</p>
                  ) : null}
                </>
              ) : (
                <p className="mt-[0.7cqw] text-[1.1cqw] text-[#6e6e73]">Authorised signature</p>
              )}
              <p className="mt-[1.2cqw] text-[1.1cqw] text-[#6e6e73]">
                Issued {formatDate(issuedOn)}
              </p>
              {expiresOn ? (
                <p className="text-[1.1cqw] text-[#6e6e73]">Valid until {formatDate(expiresOn)}</p>
              ) : null}
            </div>

            <div className="flex items-end gap-[1.2cqw]">
              <div className="text-right">
                <p className="text-[1.1cqw] text-[#6e6e73]">Certificate ID</p>
                <p className="max-w-[16cqw] font-mono text-[0.95cqw] break-all text-[#1d1d1f]">
                  {certificateId ?? "Assigned on issue"}
                </p>
                <p className="mt-[0.5cqw] text-[1cqw] text-[#6e6e73]">Scan to verify</p>
              </div>
              {qrSrc ? (
                // eslint-disable-next-line @next/next/no-img-element -- data URL
                <img src={qrSrc} alt="" className="size-[9cqw] shrink-0" />
              ) : (
                <svg
                  viewBox="0 0 21 21"
                  className="size-[9cqw] shrink-0 text-[#1d1d1f]/80"
                  fill="currentColor"
                  fillRule="evenodd"
                  aria-hidden="true"
                  shapeRendering="crispEdges"
                >
                  <path d={PLACEHOLDER} />
                </svg>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
