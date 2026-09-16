import { requireStaff } from "@/lib/auth";
import { GrantIssuerForm } from "@/components/grant-issuer-form";
import { getIssuerAddress, explorerAddressUrl } from "@/lib/chain/client";
import { env } from "@/lib/env";

export default async function AdminPage() {
  const { staff } = await requireStaff();

  if (staff.role !== "admin") {
    return (
      <>
        <h1 className="text-2xl font-semibold tracking-tight">Issuers</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Only an admin can manage issuer wallets.
        </p>
      </>
    );
  }

  const issuerAddress = getIssuerAddress();

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Issuers</h1>
      <p className="mt-2 max-w-prose text-sm text-muted-foreground text-pretty">
        Granting <code className="font-mono text-xs">ISSUER_ROLE</code> lets
        another wallet anchor and revoke certificates. It does not let that
        wallet grant the role to anyone else — only the admin can do that.
      </p>

      <dl className="mt-6 space-y-3 text-sm">
        <div>
          <dt className="text-muted-foreground">This app signs with</dt>
          <dd className="font-mono break-all">
            <a
              className="underline underline-offset-4 hover:no-underline"
              href={explorerAddressUrl(issuerAddress)}
              target="_blank"
              rel="noopener noreferrer"
            >
              {issuerAddress}
            </a>
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Registry contract</dt>
          <dd className="font-mono break-all">
            <a
              className="underline underline-offset-4 hover:no-underline"
              href={explorerAddressUrl(env.NEXT_PUBLIC_CONTRACT_ADDRESS)}
              target="_blank"
              rel="noopener noreferrer"
            >
              {env.NEXT_PUBLIC_CONTRACT_ADDRESS}
            </a>
          </dd>
        </div>
      </dl>

      <div className="mt-8 max-w-md">
        <GrantIssuerForm />
      </div>
    </>
  );
}
