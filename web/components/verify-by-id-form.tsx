import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * A plain HTML GET form. The browser navigates to /verify?id=… and the route
 * redirects to /verify/<id>.
 *
 * Deliberately NOT a client component: the landing page is the most-visited
 * page in the system and the one most likely to be opened on a phone with a
 * poor connection, so it ships no JavaScript for this at all. It also keeps
 * working with JS disabled.
 */
export function VerifyByIdForm() {
  return (
    <form action="/verify" method="get" className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <div className="flex-1 space-y-2">
        <Label htmlFor="certificate-id">Certificate ID</Label>
        <Input
          id="certificate-id"
          name="id"
          required
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
      <Button type="submit">Verify</Button>
    </form>
  );
}
