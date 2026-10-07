"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Upload, ShieldCheck, LoaderCircle, LockKeyhole, ArrowRight } from "lucide-react";
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

export function PdfTamperCheck({ resultBase = "/verify" }: { resultBase?: string })  {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
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
    <div className="space-y-5">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <form onSubmit={handleSubmit} className="min-w-0 space-y-4" aria-busy={outcome.kind === "checking"}>
          <label htmlFor="file" className="relative flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/30 px-6 py-8 text-center transition-colors hover:border-primary/50 hover:bg-muted/50 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30">
            <span className="mb-4 flex size-12 items-center justify-center rounded-xl border bg-card text-foreground">
              {selectedFile ? <FileText className="size-6" /> : <Upload className="size-6" />}
            </span>
            <span className="max-w-full break-all text-sm font-medium">
              {selectedFile ? selectedFile.name : "Choose a certificate PDF"}
            </span>
            <span id="file-hint" className="mt-2 text-xs text-muted-foreground">
              {selectedFile ? `${(selectedFile.size / 1024).toFixed(0)} KB · Click to replace` : "Click to browse · PDF only · Up to 5 MB"}
            </span>
            <input id="file" name="file" type="file" accept="application/pdf,.pdf"
              required disabled={outcome.kind === "checking"} aria-describedby="file-hint"
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-wait"
              onChange={(event) => {
                setSelectedFile(event.target.files?.[0] ?? null);
                setOutcome({ kind: "idle" });
              }} />
          </label>
          <Button type="submit" className="w-full gap-2" size="lg" disabled={!selectedFile || outcome.kind === "checking"}>
            {outcome.kind === "checking" ? <LoaderCircle className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
            {outcome.kind === "checking" ? "Checking your PDF…" : "Check this PDF"}
          </Button>
          <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <LockKeyhole className="size-3.5 shrink-0" /> Your upload is checked without being stored.
          </p>
        </form>

        <aside className="rounded-2xl border bg-muted/20 p-5 sm:p-6">
          <h3 className="text-sm font-medium">What we check</h3>
          <ol className="mt-5 space-y-5">
            {[
              ["Read the original PDF", "Use the downloaded certificate, rather than a scan or screenshot."],
              ["Compare its fingerprint", "We compare the file with the exact PDF issued by this platform."],
              ["Show the result", "A match confirms the file is unchanged. You can then review the certificate’s current status."],
            ].map(([title, detail], index) => (
              <li key={title} className="flex gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full border bg-card text-xs font-medium">{index + 1}</span>
                <div><p className="text-sm font-medium">{title}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{detail}</p></div>
              </li>
            ))}
          </ol>
          <p className="mt-6 border-t pt-4 text-xs leading-relaxed text-muted-foreground">Editing or re-saving a PDF can change its fingerprint. A file without a match may also have been issued elsewhere.</p>
        </aside>
      </div>

      <div aria-live="polite" aria-atomic="true">
        {outcome.kind === "error" ? (
          <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{outcome.message}</div>
        ) : null}
        {outcome.kind === "tampered" ? (
          <section className="space-y-4 rounded-2xl border border-destructive/30 bg-card p-5 sm:p-6">
            <h3 className="text-base font-semibold">No matching PDF found</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{outcome.message}</p>
            <details className="rounded-xl border bg-muted/30 p-3">
              <summary className="cursor-pointer text-xs font-medium">View file fingerprint</summary>
              <p className="mt-3 break-all font-mono text-xs text-muted-foreground">SHA-256: {outcome.sha256}</p>
            </details>
          </section>
        ) : null}
        {outcome.kind === "match" ? (
          <section className="space-y-4 rounded-2xl border bg-card p-5 sm:p-6">
            <div className="flex items-center gap-2 text-sm font-medium"><ShieldCheck className="size-5 text-emerald-600" /> Original PDF matched</div>
            <p className="text-sm text-muted-foreground">This file matches the certificate we issued, byte for byte.</p>
            <StatusSeal status={outcome.status} />
            <Button asChild variant="outline" className="gap-2">
              <Link href={`${resultBase}/${outcome.certificateId}`}>See full certificate details <ArrowRight className="size-4" /></Link>
            </Button>
          </section>
        ) : null}
      </div>
    </div>
  );
}
