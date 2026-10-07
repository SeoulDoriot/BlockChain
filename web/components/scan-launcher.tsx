"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Camera, ScanLine } from "lucide-react";
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

/**
 * `resultBase` is where a successful scan goes: the public page by default, or
 * the in-dashboard result when staff scan from inside the app.
 */
export function ScanLauncher({ resultBase = "/verify", featured = false }: { resultBase?: string; featured?: boolean }) {
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
            router.push(`${resultBase}/${encodeURIComponent(id)}`);
          }}
          onError={(message) => setError(message)}
        />
      ) : (
        <div className={featured ? "rounded-2xl border border-dashed bg-muted/30 px-6 py-10 text-center sm:py-12" : ""}>
          {featured ? <>
            <span className="mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl border bg-card"><ScanLine className="size-8" strokeWidth={1.5} /></span>
            <h2 className="text-lg font-medium">Ready to scan</h2>
            <p className="mx-auto mt-2 mb-6 max-w-xs text-sm leading-relaxed text-muted-foreground">Place the certificate’s QR code inside the camera frame.</p>
          </> : null}
          <Button className={featured ? "h-12 w-full gap-2 rounded-xl text-base" : ""} onClick={() => { setError(null); setActive(true); }}>
            {featured ? <Camera className="size-4" /> : null} Start camera
          </Button>
        </div>
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
