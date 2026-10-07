import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FileSearch, GitCommitHorizontal, Lock, ScanLine, ShieldCheck, UserRoundCheck } from "lucide-react";
import { LocaleToggle } from "@/components/locale-toggle";
import { PublicShell } from "@/components/public-shell";
import { VerifyByIdForm } from "@/components/verify-by-id-form";
import { getDictionary } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Verify a certificate",
  description: "Check the authenticity of a digital certificate.",
};

/**
 * The public verification page. With `?id=` it forwards to the result, so the
 * lookup form can be a plain GET form that needs no JavaScript.
 */
export const instant = false;

const SECONDARY =
  "group flex items-center gap-3 rounded-2xl border bg-background px-4 py-3.5 text-[15px] font-medium transition-[border-color,background-color,transform] duration-200 hover:border-foreground/25 hover:bg-card";

export default async function VerifyIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const trimmed = id?.trim();
  if (trimmed) redirect(`/verify/${encodeURIComponent(trimmed)}`);

  const { locale, t } = await getDictionary();

  const trust = [
    { icon: ShieldCheck, title: t.trust1Title, body: t.trust1Body },
    { icon: GitCommitHorizontal, title: t.trust2Title, body: t.trust2Body },
    { icon: UserRoundCheck, title: t.trust3Title, body: t.trust3Body },
  ];

  return (
    <PublicShell
      width="max-w-3xl"
      className="pt-4 pb-10 sm:pt-8 sm:pb-10"
      actions={<LocaleToggle locale={locale} from="/verify" />}
    >
      <div className="text-center">
        <p className="inline-flex items-center gap-2 rounded-full border bg-card px-3.5 py-1.5 text-sm text-muted-foreground">
          <span className="size-1.5 rounded-full bg-[#2f9e66]" aria-hidden="true" />
          {t.org}
        </p>
        <h1 className="mt-6 text-4xl leading-[1.08] font-semibold tracking-tight text-balance sm:text-6xl">
          {t.verifyHeading}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground text-pretty">
          {t.verifyDescription}
        </p>
      </div>

      <section
        aria-label={t.verifyHeading}
        className="mt-10 rounded-[28px] border bg-card p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03),0_12px_32px_-16px_rgba(0,0,0,0.08)] sm:p-8"
      >
        <VerifyByIdForm
          inline
          labels={{
            certificateId: t.enterCertificateId,
            hint: t.certificateIdHint,
            verify: t.verify,
          }}
        />

        <div className="my-6 flex items-center gap-4 text-sm text-muted-foreground" aria-hidden="true">
          <span className="h-px flex-1 bg-border" />
          {t.orLabel}
          <span className="h-px flex-1 bg-border" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Link href="/scan" className={SECONDARY}>
            <span className="flex size-9 items-center justify-center rounded-xl bg-secondary">
              <ScanLine className="size-[18px]" strokeWidth={1.75} />
            </span>
            {t.scanQr}
          </Link>
          <Link href="/verify/upload" className={SECONDARY}>
            <span className="flex size-9 items-center justify-center rounded-xl bg-secondary">
              <FileSearch className="size-[18px]" strokeWidth={1.75} />
            </span>
            {t.checkPdf}
          </Link>
        </div>
      </section>

      <ul className="mt-6 grid gap-3 sm:grid-cols-3">
        {trust.map((item) => (
          <li key={item.title} className="rounded-2xl px-1 py-2 sm:px-3">
            <item.icon className="size-[18px] text-muted-foreground" strokeWidth={1.75} />
            <p className="mt-3 text-[15px] font-medium">{item.title}</p>
            <p className="mt-1 text-sm text-muted-foreground text-pretty">{item.body}</p>
          </li>
        ))}
      </ul>

      <p className="mt-8 flex items-start justify-center gap-2 border-t pt-6 text-center text-xs text-muted-foreground text-pretty sm:text-sm">
        <Lock className="mt-0.5 size-3.5 shrink-0" strokeWidth={1.75} />
        {t.privacyNote}
      </p>
    </PublicShell>
  );
}
