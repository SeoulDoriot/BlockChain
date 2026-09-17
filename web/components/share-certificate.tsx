"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * Sharing actions for a verified certificate.
 *
 * "Add to profile" uses LinkedIn's certification deep link, which pre-fills
 * their form from the query string. Only data already public on this page is
 * sent — never the recipient's email address.
 */
export function ShareCertificate({
  verifyUrl,
  certificateId,
  courseTitle,
  orgName,
  issuedOn,
  expiresOn,
  labels,
}: {
  verifyUrl: string;
  certificateId: string;
  courseTitle: string;
  orgName: string;
  issuedOn: string;
  expiresOn: string | null;
  labels: { addToLinkedIn: string; share: string; copy: string; copied: string };
}) {
  const [copied, setCopied] = useState(false);

  const [issueYear, issueMonth] = issuedOn.split("-");
  const expiry = expiresOn?.split("-");

  const linkedInParams = new URLSearchParams({
    startTask: "CERTIFICATION_NAME",
    name: courseTitle,
    organizationName: orgName,
    issueYear: issueYear ?? "",
    issueMonth: String(Number(issueMonth ?? "1")),
    certUrl: verifyUrl,
    certId: certificateId,
  });

  if (expiry) {
    linkedInParams.set("expirationYear", expiry[0] ?? "");
    linkedInParams.set("expirationMonth", String(Number(expiry[1] ?? "1")));
  }

  const addToProfile = `https://www.linkedin.com/profile/add?${linkedInParams.toString()}`;
  const shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(verifyUrl)}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(verifyUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be refused; the link is on screen either way.
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button asChild variant="outline" size="sm">
        <a href={addToProfile} target="_blank" rel="noopener noreferrer">
          {labels.addToLinkedIn}
        </a>
      </Button>
      <Button asChild variant="outline" size="sm">
        <a href={shareUrl} target="_blank" rel="noopener noreferrer">
          {labels.share}
        </a>
      </Button>
      <Button variant="ghost" size="sm" onClick={copy}>
        <span aria-live="polite">{copied ? labels.copied : labels.copy}</span>
      </Button>
    </div>
  );
}
