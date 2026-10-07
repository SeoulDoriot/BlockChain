"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Download, ExternalLink, Ban } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Busy = null | "revoke" | "renew" | "resend" | "retry";
type Status = "draft" | "issued" | "revoked";

function useCertificateCall(certificateId: string) {
  const router = useRouter();
  const [busy, setBusy] = useState<Busy>(null);

  async function call(
    action: Exclude<Busy, null>,
    body?: Record<string, unknown>,
  ): Promise<boolean> {
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
        return false;
      }

      if (action === "renew" && data.id) {
        toast.success("Renewed. A new certificate has been issued.");
        router.push(`/dashboard/certificates/${data.id}`);
        router.refresh();
        return true;
      }

      toast.success(
        action === "resend"
          ? `Email queued to ${data.to}.`
          : `${action[0]!.toUpperCase()}${action.slice(1)} complete.`,
      );
      router.refresh();
      return true;
    } catch (error) {
      toast.error((error as Error).message);
      return false;
    } finally {
      setBusy(null);
    }
  }

  return { busy, call };
}

/** Header buttons: download, public page, and the revoke confirmation. */
export function CertificateToolbar({
  certificateId,
  status,
  hasPdf,
  canAct,
}: {
  certificateId: string;
  status: Status;
  hasPdf: boolean;
  canAct: boolean;
}) {
  const { busy, call } = useCertificateCall(certificateId);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  return (
    <>
      {hasPdf ? (
        <Button asChild variant="outline">
          <a href={`/api/certificates/${certificateId}/pdf`}>
            <Download strokeWidth={1.75} /> Download PDF
          </a>
        </Button>
      ) : null}
      <Button asChild variant="outline">
        <Link href={`/verify/${certificateId}`}>
          <ExternalLink strokeWidth={1.75} /> View Certificate
        </Link>
      </Button>
      {canAct && status === "issued" ? (
        <Button variant="destructive" onClick={() => setOpen(true)}>
          <Ban strokeWidth={1.75} /> Revoke Certificate
        </Button>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Revoke this certificate?</DialogTitle>
            <DialogDescription>
              Revoking is permanent and is recorded on the blockchain. Anyone
              verifying this certificate will see that it has been withdrawn.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Why is this certificate being withdrawn?"
              rows={3}
            />
          </div>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={busy !== null || reason.trim().length < 3}
              onClick={async () => {
                if (await call("revoke", { reason: reason.trim() })) setOpen(false);
              }}
            >
              {busy === "revoke" ? "Revoking…" : "Revoke Certificate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Secondary actions: retry, resend, renew. */
export function CertificateActions({
  certificateId,
  status,
  expiresOn,
}: {
  certificateId: string;
  status: Status;
  expiresOn: string | null;
}) {
  const { busy, call } = useCertificateCall(certificateId);
  const [newExpiry, setNewExpiry] = useState("");

  if (status === "revoked") {
    return (
      <p className="text-sm text-muted-foreground">
        This certificate is revoked. Revocation cannot be undone.
      </p>
    );
  }

  return (
    <div className="divide-y">
      {status === "draft" ? (
        <section className="flex flex-wrap items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
          <div className="max-w-md">
            <p className="text-sm font-medium">Issue this draft</p>
            <p className="text-sm text-muted-foreground text-pretty">
              This certificate has not been recorded yet. Issuing is safe to
              repeat — the ID and fingerprint never change.
            </p>
          </div>
          <Button onClick={() => call("retry")} disabled={busy !== null}>
            {busy === "retry" ? "Issuing…" : "Issue now"}
          </Button>
        </section>
      ) : null}

      {status === "issued" ? (
        <>
          <section className="flex flex-wrap items-center justify-between gap-4 py-4 first:pt-0">
            <div className="max-w-md">
              <p className="text-sm font-medium">Resend email</p>
              <p className="text-sm text-muted-foreground">
                Sends the stored PDF again to the original recipient.
              </p>
            </div>
            <Button variant="outline" onClick={() => call("resend")} disabled={busy !== null}>
              {busy === "resend" ? "Sending…" : "Resend email"}
            </Button>
          </section>

          <section className="space-y-3 py-4 last:pb-0">
            <div className="max-w-md">
              <Label htmlFor="newExpiry" className="text-sm font-medium">
                Renew
              </Label>
              <p id="renew-hint" className="mt-1 text-sm text-muted-foreground text-pretty">
                Issues a new certificate with a later expiry. The expiry date is
                part of the fingerprint, so the original cannot be edited.
                {expiresOn ? ` Current expiry: ${expiresOn}.` : ""}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                id="newExpiry"
                type="date"
                value={newExpiry}
                onChange={(event) => setNewExpiry(event.target.value)}
                className="w-auto"
                aria-describedby="renew-hint"
              />
              <Button
                variant="outline"
                disabled={busy !== null || !newExpiry}
                onClick={() => call("renew", { expiresOn: newExpiry })}
              >
                {busy === "renew" ? "Renewing…" : "Renew"}
              </Button>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
