import { cn } from "@/lib/utils";
import { KIT_BACKGROUND, QR_BOX, SIGNATURE_BOX, templateText, TEMPLATE_WIDTH, TEMPLATE_HEIGHT } from "@/lib/cert/template-layout";
import type { CertificatePreviewProps } from "@/components/certificate-preview";

export function KitCertificatePreview(props: CertificatePreviewProps) {
  return (
    <div className={cn("certificate-sheet relative aspect-[297/210] w-full overflow-hidden bg-white", props.className)}
      role="img" aria-label={`Certificate preview for ${props.recipientName || "recipient"}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- fixed full-resolution print background */}
      <img src={KIT_BACKGROUND} alt="" className="absolute inset-0 h-full w-full object-contain" />
      <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${TEMPLATE_WIDTH} ${TEMPLATE_HEIGHT}`}>
        {templateText(props).map((item, index) => (
          <text key={index} x={item.x} y={item.y} fontSize={item.size} fill={item.color}
            textAnchor={item.anchor} letterSpacing={item.spacing}
            fontFamily={item.font === "metadata" ? "Certificate Inter, Arial, sans-serif" : '"Certificate Serif", "Times New Roman", Times, serif'}
            fontWeight={item.font === "bold" || item.font === "name" ? "bold" : "normal"}
            fontStyle={item.font === "name" ? "italic" : "normal"}>
            {item.text}
          </text>
        ))}
        {props.qrSrc ? <image href={props.qrSrc} {...QR_BOX} preserveAspectRatio="xMidYMid meet" /> : (
          <g>
            <rect {...QR_BOX} fill="white" />
            <text x={QR_BOX.x + QR_BOX.width / 2} y={QR_BOX.y + QR_BOX.height / 2}
              textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="13" fill="#555">QR on issue</text>
          </g>
        )}
        {props.signatureSrc ? <image href={props.signatureSrc} {...SIGNATURE_BOX} preserveAspectRatio="xMidYMax meet" /> : null}
      </svg>
    </div>
  );
}
