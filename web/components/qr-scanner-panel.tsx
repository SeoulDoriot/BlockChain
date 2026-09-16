"use client";

import { Scanner, type IDetectedBarcode } from "@yudiel/react-qr-scanner";

/**
 * The actual scanner. Imported only via next/dynamic from scan-button.tsx, so
 * the barcode-detection library is never part of the initial bundle — it is
 * fetched when the user chooses to scan.
 */
export default function QrScannerPanel({
  onResult,
  onError,
}: {
  onResult: (value: string) => void;
  onError: (message: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <Scanner
        formats={["qr_code"]}
        onScan={(codes: IDetectedBarcode[]) => {
          const value = codes[0]?.rawValue;
          if (value) onResult(value);
        }}
        onError={(error: unknown) => {
          onError(
            error instanceof Error
              ? error.message
              : "Could not start the camera.",
          );
        }}
        components={{ finder: true }}
        allowMultiple={false}
      />
    </div>
  );
}
