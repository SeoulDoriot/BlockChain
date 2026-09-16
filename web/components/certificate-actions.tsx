"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Busy = null | "revoke" | "renew" | "resend" | "retry";

export function CertificateActions({
  certificateId,
  status,
  expiresOn,
}: {
  certificateId: string;
  status: "draft" | "issued" | "revoked";
  expiresOn: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<Busy>(null);
  const [reason, setReason] = useState("");
  const [newExpiry, setNewExpiry] = useState("");

  async function call(
    action: Exclude<Busy, null>,
    body?: Record<string, unknown>,
  ) {
    setBusy(action);
    try {
      const response = await fetch(`/api/certificates/${certificateId}/${action}`, {
        method: "POST",
        headers: body ? { "content-type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error ?? `${action} failed.`);
        return;
      }

      if (action === "renew" && data.id) {
        toast.success("Renewed. A new certificate has been issued.");
        router.push(`/dashboard/certificates/${data.id}`);
        router.refresh();
        return;
      }

      toast.success(
        action === "resend"
          ? `Email queued to ${data.to}.`
          : `${action[0]!.toUpperCase()}${action.slice(1)} complete.`,
      );
      router.refresh();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-8">
      <h2 className="text-sm font-medium">Actions</h2>

      {status === "draft" ? (
        <section className="space-y-2">
          <p className="text-sm text-muted-foreground text-pretty">
            This certificate was never anchored — issuing failed partway.
            Retrying is safe: the id and hash are unchanged.
          </p>
          <Button size="sm" onClick={() => call("retry")} disabled={busy !== null}>
            {busy === "retry" ? "Retrying…" : "Retry issuing"}
          </Button>
        </section>
      ) : null}

      {status === "issued" ? (
        <>
          <section className="space-y-2">
            <Label htmlFor="resend">Resend the email</Label>
            <p id="resend-hint" className="text-sm text-muted-foreground">
              Sends the stored PDF again to the original recipient.
            </p>
            <Button
              id="resend"
              size="sm"
              variant="outline"
              onClick={() => call("resend")}
              disabled={busy !== null}
              aria-describedby="resend-hint"
            >
              {busy === "resend" ? "Sending…" : "Resend email"}
            </Button>
          </section>

          <section className="space-y-2">
            <Label htmlFor="newExpiry">Renew</Label>
            <p id="renew-hint" className="text-sm text-muted-foreground text-pretty">
              Issues a new certificate with a later expiry. The old one keeps
              its record — the expiry date is part of the hash, so it cannot be
              edited in place.
            </p>
            <div className="flex flex-wrap items-end gap-2">
              <Input
                id="newExpiry"
                type="date"
                value={newExpiry}
                onChange={(event) => setNewExpiry(event.target.value)}
                className="w-auto"
                aria-describedby="renew-hint"
              />
              <Button
                size="sm"
                variant="outline"
                disabled={busy !== null || !newExpiry}
                onClick={() => call("renew", { expiresOn: newExpiry })}
              >
                {busy === "renew" ? "Renewing…" : "Renew"}
              </Button>
            </div>
            {expiresOn ? (
              <p className="text-xs text-muted-foreground">
                Current expiry: {expiresOn}
              </p>
            ) : null}
          </section>

          <section className="space-y-2">
            <Label htmlFor="reason">Revoke</Label>
            <p id="revoke-hint" className="text-sm text-muted-foreground text-pretty">
              Permanent and recorded on-chain. Use this when a certificate was
              issued in error or must be withdrawn.
            </p>
            <Textarea
              id="reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Reason for revocation"
              rows={2}
              aria-describedby="revoke-hint"
            />
            <Button
              size="sm"
              variant="destructive"
              disabled={busy !== null || reason.trim().length < 3}
              onClick={() => call("revoke", { reason: reason.trim() })}
            >
              {busy === "revoke" ? "Revoking…" : "Revoke certificate"}
            </Button>
          </section>
        </>
      ) : null}

      {status === "revoked" ? (
        <p className="text-sm text-muted-foreground">
          This certificate is revoked. Revocation cannot be undone.
        </p>
      ) : null}
    </div>
  );
}
