import { requireStaff } from "@/lib/auth";
import { GrantIssuerForm } from "@/components/grant-issuer-form";
import { getIssuerAddress, explorerAddressUrl } from "@/lib/chain/client";
import { env, isLocalChain } from "@/lib/env";
import { PageHeader } from "@/components/page-header";

/** Authenticated on every request, so this route is expected to block. */
export const instant = false;

export default async function AdminPage() {
  const { staff } = await requireStaff();

  if (staff.role !== "admin") {
    return (
      <div className="space-y-6">
        <PageHeader title="Issuers" description="Only an admin can manage issuer wallets." />
      </div>
    );
  }

  const issuerAddress = getIssuerAddress();
  const contract = env.NEXT_PUBLIC_CONTRACT_ADDRESS;

  const addr = (value: string) =>
    isLocalChain ? (
      value
    ) : (
      <a
        className="underline underline-offset-4 hover:no-underline"
        href={explorerAddressUrl(value)}
        target="_blank"
        rel="noopener noreferrer"
      >
        {value}
      </a>
    );

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title="Issuers"
        description="Granting the issuer role lets another wallet record and revoke certificates. Only the admin can grant it."
      />

      <section className="rounded-2xl border bg-card px-6 py-2">
        <dl className="divide-y">
          <div className="grid gap-0.5 py-3 sm:grid-cols-[10rem_1fr] sm:gap-4">
            <dt className="text-sm text-muted-foreground">This app signs with</dt>
            <dd className="font-mono text-xs sm:text-[13px] break-all">
              {addr(issuerAddress)}
            </dd>
          </div>
          <div className="grid gap-0.5 py-3 sm:grid-cols-[10rem_1fr] sm:gap-4">
            <dt className="text-sm text-muted-foreground">Registry contract</dt>
            <dd className="font-mono text-xs sm:text-[13px] break-all">
              {addr(contract)}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl border bg-card p-6">
        <h2 className="mb-4 text-base font-medium">Grant issuer role</h2>
        <div className="max-w-md">
          <GrantIssuerForm />
        </div>
      </section>
    </div>
  );
}
