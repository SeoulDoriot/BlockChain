"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * The scanner library is heavy and most visitors never open it, so it is
 * loaded on demand with ssr:false — nothing ships until "Start camera" is
 * pressed.
 */
const QrScannerPanel = dynamic(() => import("@/components/qr-scanner-panel"), {
  ssr: false,
  loading: () => <Skeleton className="aspect-square w-full rounded-lg" />,
});

/** Accepts a full verify URL or a bare certificate id. */
export function extractCertificateId(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;

  try {
    const url = new URL(value);
    const match = url.pathname.match(/\/verify\/([^/?#]+)/);
    if (match?.[1]) return decodeURIComponent(match[1]);
  } catch {
    // not a URL — fall through and treat it as a bare id
  }

  return /^[0-9a-fA-F-]{16,64}$/.test(value) ? value : null;
}

export function ScanLauncher() {
  const router = useRouter();
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {active ? (
        <QrScannerPanel
          onResult={(value) => {
            const id = extractCertificateId(value);
            if (!id) {
              setError("That QR code is not a certificate link.");
              return;
            }
            setActive(false);
            router.push(`/verify/${encodeURIComponent(id)}`);
          }}
          onError={(message) => setError(message)}
        />
      ) : (
        <Button onClick={() => { setError(null); setActive(true); }}>
          Start camera
        </Button>
      )}

      {active ? (
        <Button variant="ghost" size="sm" onClick={() => setActive(false)}>
          Stop camera
        </Button>
      ) : null}

      <p aria-live="polite">
        {error ? (
          <span role="alert" className="text-sm text-destructive">
            {error}
          </span>
        ) : null}
      </p>
    </div>
  );
}
