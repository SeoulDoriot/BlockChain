import Link from "next/link";
import { Button } from "@/components/ui/button";
import { VerifyByIdForm } from "@/components/verify-by-id-form";
import { LocaleToggle } from "@/components/locale-toggle";
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

  return (
    <>
      <div className="mb-8 flex justify-end">
        <LocaleToggle locale={locale} from="/" />
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium text-muted-foreground">{t.org}</p>
        <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          {t.siteTitle}
        </h1>
        <p className="max-w-prose text-lg text-muted-foreground text-pretty">
          {t.tagline}
        </p>
      </div>

      <div className="mt-10">
        <VerifyByIdForm
          labels={{
            certificateId: t.certificateId,
            hint: t.certificateIdHint,
            verify: t.verify,
          }}
        />
      </div>

      <div className="mt-10 flex flex-wrap items-center gap-3">
        <Button asChild variant="outline">
          <Link href="/scan">{t.scanQr}</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/verify/upload">{t.checkPdf}</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/login">{t.staffSignIn}</Link>
        </Button>
      </div>
    </>
  );
}

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center px-6 py-16">
      <Content />
    </main>
  );
}
