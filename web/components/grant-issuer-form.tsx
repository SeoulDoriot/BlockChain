"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function GrantIssuerForm() {
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await fetch("/api/admin/issuers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address: address.trim() }),
      });
      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error ?? "Could not grant the role.");
        return;
      }
      toast.success("Issuer role granted.");
      setAddress("");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="address">Wallet address</Label>
        <Input
          id="address"
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          placeholder="0x…"
          className="font-mono"
          autoComplete="off"
          spellCheck={false}
          required
        />
      </div>
      <Button type="submit" disabled={busy || address.trim().length !== 42}>
        {busy ? "Granting…" : "Grant issuer role"}
      </Button>
    </form>
  );
}
