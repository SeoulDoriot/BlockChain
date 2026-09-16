"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { StatusSeal } from "@/components/status-seal";
import type { DisplayStatus } from "@/lib/status";

type Outcome =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "error"; message: string }
  | { kind: "tampered"; sha256: string; message: string }
  | {
      kind: "match";
      sha256: string;
      certificateId: string;
      status: DisplayStatus;
    };

export function PdfTamperCheck() {
  const [outcome, setOutcome] = useState<Outcome>({ kind: "idle" });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const input = form.elements.namedItem("file") as HTMLInputElement | null;
    const file = input?.files?.[0];

    if (!file) {
      setOutcome({ kind: "error", message: "Choose a PDF first." });
      return;
    }

    setOutcome({ kind: "checking" });

    const body = new FormData();
    body.append("file", file);

    try {
      const response = await fetch("/api/verify/upload", { method: "POST", body });
      const data = await response.json();

      if (!response.ok) {
        setOutcome({ kind: "error", message: data.error ?? "Check failed." });
        return;
      }

      if (data.result === "tampered") {
        setOutcome({ kind: "tampered", sha256: data.sha256, message: data.message });
      } else {
        setOutcome({
          kind: "match",
          sha256: data.sha256,
          certificateId: data.certificateId,
          status: data.status,
        });
      }
    } catch (error) {
      setOutcome({ kind: "error", message: (error as Error).message });
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="file">Certificate PDF</Label>
          <input
            id="file"
            name="file"
            type="file"
            accept="application/pdf,.pdf"
            required
            className="block w-full text-sm file:mr-3 file:rounded-md file:border file:bg-transparent file:px-3 file:py-1.5 file:text-sm"
          />
          <p className="text-xs text-muted-foreground">
            The file is fingerprinted in the request and not stored.
          </p>
        </div>

        <Button type="submit" disabled={outcome.kind === "checking"}>
          {outcome.kind === "checking" ? "Checking…" : "Check this PDF"}
        </Button>
      </form>

      <div aria-live="polite">
        {outcome.kind === "error" ? (
          <p role="alert" className="text-sm text-destructive">
            {outcome.message}
          </p>
        ) : null}

        {outcome.kind === "tampered" ? (
          <div className="space-y-3">
            <StatusSeal status="not_found" tampered />
            <p className="text-sm text-muted-foreground text-pretty">
              {outcome.message}
            </p>
            <p className="font-mono text-xs break-all text-muted-foreground">
              sha256: {outcome.sha256}
            </p>
          </div>
        ) : null}

        {outcome.kind === "match" ? (
          <div className="space-y-3">
            <StatusSeal status={outcome.status} />
            <p className="text-sm text-muted-foreground">
              This file matches the certificate we issued, byte for byte.
            </p>
            <Button asChild variant="outline" size="sm">
              <Link href={`/verify/${outcome.certificateId}`}>
                See full certificate details
              </Link>
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
