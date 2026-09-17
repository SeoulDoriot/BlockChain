import { NextResponse } from "next/server";
import { LOCALE_COOKIE, isLocale } from "@/lib/i18n";

/**
 * Sets the language cookie and returns the visitor to where they were.
 *
 * A plain form POST rather than a client-side toggle, so switching language
 * needs no JavaScript and the next render is already in the new language.
 */
export async function POST(request: Request) {
  const form = await request.formData();
  const locale = String(form.get("locale") ?? "");
  const from = String(form.get("from") ?? "/");

  // Never redirect to an absolute URL supplied in a form field.
  const destination = from.startsWith("/") && !from.startsWith("//") ? from : "/";

  const response = NextResponse.redirect(new URL(destination, request.url), 303);

  if (isLocale(locale)) {
    response.cookies.set(LOCALE_COOKIE, locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }

  return response;
}
