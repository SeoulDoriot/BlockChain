"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SignatoryForm({
  initialName,
  initialTitle,
  signatureSrc,
}: {
  initialName: string;
  initialTitle: string;
  /** Data URL of the signature currently on file. */
  signatureSrc?: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [title, setTitle] = useState(initialTitle);
  const [file, setFile] = useState<File | null>(null);
  const [remove, setRemove] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const body = new FormData();
    body.set("name", name);
    body.set("title", title);
    if (file) body.set("image", file);
    if (remove && !file) body.set("removeImage", "1");

    try {
      const response = await fetch("/api/org/signatory", { method: "POST", body });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "Could not save.");
        return;
      }
      toast.success("Signatory saved. New certificates will carry it.");
      setFile(null);
      setRemove(false);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="signatory-name">Name</Label>
          <Input
            id="signatory-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Dr. Sok Pisey"
            autoComplete="off"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="signatory-title">Title</Label>
          <Input
            id="signatory-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Chairman"
            autoComplete="off"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="signature-image">Signature image (optional)</Label>
        {signatureSrc && !remove && !file ? (
          <div className="flex items-center gap-4 rounded-xl border bg-white p-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- data URL */}
            <img src={signatureSrc} alt="Current signature" className="h-12 max-w-48 object-contain" />
            <button
              type="button"
              onClick={() => setRemove(true)}
              className="ml-auto text-sm text-muted-foreground transition-colors hover:text-destructive"
            >
              Remove
            </button>
          </div>
        ) : null}
        <input
          id="signature-image"
          type="file"
          accept="image/png,image/jpeg"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setRemove(false);
          }}
          className="block w-full text-sm file:mr-3 file:rounded-lg file:border file:bg-card file:px-3 file:py-2 file:text-sm file:font-medium"
        />
        <p className="text-xs text-muted-foreground">
          PNG or JPG under 400 KB. A transparent PNG of a handwritten signature looks best.
        </p>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={busy || name.trim().length < 2 || title.trim().length < 2}>
        {busy ? "Saving…" : "Save signatory"}
      </Button>
    </form>
  );
}
