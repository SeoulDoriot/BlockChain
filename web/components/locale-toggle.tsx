import { DICTIONARY, type Locale } from "@/lib/i18n";

/**
 * Language switch. A server component wrapping a plain form, so it ships no
 * JavaScript and works without it.
 */
export function LocaleToggle({
  locale,
  from,
}: {
  locale: Locale;
  from: string;
}) {
  const next: Locale = locale === "en" ? "km" : "en";

  return (
    <form action="/api/locale" method="post">
      <input type="hidden" name="locale" value={next} />
      <input type="hidden" name="from" value={from} />
      <button
        type="submit"
        lang={next}
        className="rounded-md border px-2.5 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        {DICTIONARY[next].localeName}
      </button>
    </form>
  );
}
