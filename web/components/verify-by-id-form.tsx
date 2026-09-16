"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Small client island: everything else on the landing page is static.
 */
export function VerifyByIdForm() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [pending, startTransition] = useTransition();

  const id = value.trim();

  return (
    <form
      className="flex flex-col gap-2 sm:flex-row sm:items-end"
      onSubmit={(event) => {
        event.preventDefault();
        if (!id) return;
        startTransition(() => router.push(`/verify/${encodeURIComponent(id)}`));
      }}
    >
      <div className="flex-1 space-y-2">
        <Label htmlFor="certificate-id">Certificate ID</Label>
        <Input
          id="certificate-id"
          name="certificate-id"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="3f1a7b2c-8d4e-4f60-9a1b-2c3d4e5f6071"
          autoComplete="off"
          spellCheck={false}
          className="font-mono"
          aria-describedby="certificate-id-hint"
        />
        <p id="certificate-id-hint" className="text-xs text-muted-foreground">
          Printed on the certificate, under the QR code.
        </p>
      </div>
      <Button type="submit" disabled={!id || pending}>
        {pending ? "Checking…" : "Verify"}
      </Button>
    </form>
  );
}
