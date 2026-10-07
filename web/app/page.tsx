import Link from "next/link";
import { ChevronDown, FileCheck2, Link2, ScanLine, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LocaleToggle } from "@/components/locale-toggle";
import { VerifyByIdForm } from "@/components/verify-by-id-form";
import { PublicShell } from "@/components/public-shell";
import { getDictionary } from "@/lib/i18n";

/**
 * This page reads the language cookie, which is runtime data.
 *
 * It deliberately renders BLOCKING rather than streaming inside Suspense.
 * React delivers streamed content inside a <template> that only JavaScript can
 * swap in, so a Suspense boundary here would leave a visitor with scripting
 * disabled looking at a skeleton forever. The page carries no data fetching
 * beyond the cookie, so blocking costs nothing measurable.
 */
export const instant = false;

async function Content() {
  const { locale, t } = await getDictionary();

  const steps = [
    { icon: FileCheck2, title: t.how1Title, body: t.how1Body },
    { icon: Link2, title: t.how2Title, body: t.how2Body },
    { icon: ShieldCheck, title: t.how3Title, body: t.how3Body },
  ];

  return (
    <PublicShell width="max-w-6xl" actions={<LocaleToggle locale={locale} from="/" />}>
      <section className="mx-auto max-w-3xl pt-10 text-center sm:pt-24">
        <p className="text-base font-medium text-muted-foreground">{t.org}</p>
        <h1 className="mt-4 text-5xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-7xl">
          {t.heroTitle}
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-xl text-muted-foreground text-pretty">
          {t.verifyDescription}
        </p>

        <div className="mx-auto mt-12 max-w-xl">
          <VerifyByIdForm
            labels={{
              certificateId: t.enterCertificateId,
              hint: t.certificateIdHint,
              verify: t.verify,
            }}
          />
        </div>
        <div className="mt-4 flex justify-center">
          <Button asChild variant="ghost">
            <Link href="/scan">
              <ScanLine strokeWidth={1.75} /> {t.scanQr}
            </Link>
          </Button>
        </div>
        <p className="mt-8 flex items-center justify-center gap-2 text-base text-muted-foreground">
          <ShieldCheck className="size-4" strokeWidth={1.75} /> {t.trustNote}
        </p>
      </section>

      <div className="mt-10 flex justify-end sm:mt-14">
        <a
          href="#how-heading"
          className="group flex min-h-11 flex-col items-center rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
        >
          {t.howToUse}
          <span aria-hidden="true" className="mt-2 flex flex-col items-center transition-transform group-hover:translate-y-1 motion-reduce:transform-none">
            <ChevronDown className="size-5" strokeWidth={1.5} />
            <ChevronDown className="-mt-2 size-5 opacity-50" strokeWidth={1.5} />
          </span>
        </a>
      </div>

      <section className="mt-16 sm:mt-24" aria-labelledby="how-heading">
        <h2 id="how-heading" tabIndex={-1} className="scroll-mt-8 text-center text-base font-medium text-muted-foreground">
          {t.howTitle}
        </h2>
        <ol className="mt-10 grid gap-5 sm:grid-cols-3">
          {steps.map((step, index) => (
            <li key={step.title} className="rounded-3xl border bg-card p-8">
              <span className="flex size-11 items-center justify-center rounded-xl bg-secondary">
                <step.icon className="size-5" strokeWidth={1.75} />
              </span>
              <p className="mt-6 text-sm text-muted-foreground">0{index + 1}</p>
              <h3 className="mt-1 text-xl font-medium">{step.title}</h3>
              <p className="mt-3 text-base text-muted-foreground text-pretty">{step.body}</p>
            </li>
          ))}
        </ol>
        <p className="mt-10 text-center text-base text-muted-foreground">
          <Link href="/verify/upload" className="underline-offset-4 hover:underline">
            {t.checkPdf}
          </Link>
        </p>
      </section>
    </PublicShell>
  );
}

export default function Home() {
  return <Content />;
}
