import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { getIssuerAddress } from "@/lib/chain/client";
import { serverEnv } from "@/lib/env.server";
import { env, isLocalChain } from "@/lib/env";
import { PageHeader } from "@/components/page-header";
import { SignatoryForm } from "@/components/signatory-form";
import { getOrgSignatory, signatureDataUrl } from "@/lib/cert/signatory";

/** Authenticated on every request, so this route is expected to block. */
export const instant = false;

export const metadata: Metadata = { title: "Settings" };

function Row({
  label,
  children,
  mono = false,
}: {
  label: string;
  children: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="grid gap-0.5 py-3 sm:grid-cols-[10rem_1fr] sm:gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className={mono ? "font-mono text-xs sm:text-[13px] break-all" : "text-sm"}>{children}</dd>
    </div>
  );
}

function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-card px-6 py-5">
      <h2 className="text-base font-medium">{title}</h2>
      <p className="text-sm text-muted-foreground">{description}</p>
      <dl className="mt-2 divide-y">{children}</dl>
    </section>
  );
}

/**
 * Read-only: this shows how the deployment is configured. Secrets (the SMTP
 * password, the signing key) are never rendered — only the public wallet
 * address and non-sensitive mail settings.
 */
export default async function SettingsPage() {
  const { org, staff } = await requireStaff();
  const signatory = await getOrgSignatory(org.id);
  const signatureSrc = await signatureDataUrl(signatory.path);
  const isAdmin = staff.role === "admin";

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title="Settings"
        description="Your organization's profile and how certificates are issued and delivered."
      />

      <Panel title="Organization" description="Shown on every certificate you issue.">
        <Row label="Logo">
          <span className="flex size-10 items-center justify-center rounded-xl bg-secondary text-sm font-medium">
            {org.name
              .split(/\s+/)
              .slice(0, 2)
              .map((w) => w[0])
              .join("")}
          </span>
        </Row>
        <Row label="Name">{org.name}</Row>
        <Row label="Identifier" mono>
          {org.slug}
        </Row>
        <Row label="Signed in as">
          {staff.full_name ? `${staff.full_name} · ` : ""}
          {staff.email} <span className="text-muted-foreground">({staff.role})</span>
        </Row>
      </Panel>

      <section className="rounded-2xl border bg-card px-6 py-5">
        <h2 className="text-base font-medium">Signatory</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Who signs your certificates, such as the chairman or dean. Shown under the
          signature line. Applies to certificates issued from now on.
        </p>
        {isAdmin ? (
          <SignatoryForm
            initialName={signatory.name ?? ""}
            initialTitle={signatory.title ?? ""}
            signatureSrc={signatureSrc}
          />
        ) : (
          <dl className="divide-y">
            <Row label="Name">{signatory.name ?? "Not set"}</Row>
            <Row label="Title">{signatory.title ?? "Not set"}</Row>
          </dl>
        )}
      </section>

      <Panel
        title="Issuing wallet"
        description="Certificates are recorded by this wallet. Its address is public."
      >
        <Row label="Wallet address" mono>
          {getIssuerAddress()}
        </Row>
        <Row label="Network">{isLocalChain ? "Local test network" : "Polygon Amoy"}</Row>
        <Row label="Smart contract" mono>
          {env.NEXT_PUBLIC_CONTRACT_ADDRESS}
        </Row>
      </Panel>

      <Panel title="Email" description="Recipients receive their certificate from this address.">
        <Row label="From">{serverEnv.SMTP_FROM}</Row>
        <Row label="Mail server">
          {serverEnv.SMTP_HOST}:{serverEnv.SMTP_PORT}
        </Row>
        <Row label="Username">{serverEnv.SMTP_USER}</Row>
      </Panel>

      <p className="text-xs text-muted-foreground">
        These values come from the deployment configuration and are read-only here.
      </p>
    </div>
  );
}
