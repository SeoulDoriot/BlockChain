import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { env } from "@/lib/env";

/**
 * Runs before every matched request (Next.js 16 renamed Middleware to Proxy).
 *
 * Two jobs:
 *   1. Refresh the Supabase session so the auth cookie does not go stale.
 *   2. Bounce unauthenticated visitors away from /dashboard/*.
 *   3. Keep signed-in staff out of the visitor-facing entry pages: they have a
 *      dashboard equivalent, so sending staff to the public ones feels broken.
 *      A public result link (/verify/<id>) still opens for anyone, with a
 *      header hint so the page can offer a way back to the dashboard.
 *
 * Do not insert code between `createServerClient` and `getClaims()`. Anything
 * in between can cause the session to be dropped, and the bug is intermittent
 * and very hard to trace.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // getClaims() verifies the JWT. getSession() does not, and must never be
  // used to make an authorisation decision.
  const { data } = await supabase.auth.getClaims();

  const isDashboard = request.nextUrl.pathname.startsWith("/dashboard");

  if (isDashboard && !data?.claims) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  const { pathname } = request.nextUrl;

  if (data?.claims) {
    // Visitor-only pages, each with a dashboard equivalent.
    const toDashboard = pathname === "/" || pathname === "/login";
    const toVerify =
      pathname === "/verify" ||
      pathname === "/scan" ||
      pathname === "/verify/upload";

    if (toDashboard || toVerify) {
      const target = request.nextUrl.clone();
      target.pathname = toVerify ? "/dashboard/verify" : "/dashboard";
      // A ?id= lookup on /verify still has to reach its result.
      const id = request.nextUrl.searchParams.get("id")?.trim();
      target.search = "";
      if (pathname === "/verify" && id) {
        target.pathname = `/dashboard/verify/${encodeURIComponent(id)}`;
      }
      if (pathname === "/login") {
        // Already signed in: honour ?next=, but only for in-dashboard paths.
        const next = request.nextUrl.searchParams.get("next") ?? "";
        if (next.startsWith("/dashboard") && !next.startsWith("//")) target.pathname = next;
      }
      const redirect = NextResponse.redirect(target);
      for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
      return redirect;
    }
  }

  // Tell server components whether the visitor is signed in. Only a UI hint:
  // authorisation always goes through requireStaff(). A client-supplied copy
  // of the header is always discarded first, so it cannot be spoofed.
  if (data?.claims) {
    request.headers.set("x-signed-in", "1");
  } else {
    request.headers.delete("x-signed-in");
  }
  const carried = response.cookies.getAll();
  response = NextResponse.next({ request });
  for (const cookie of carried) response.cookies.set(cookie);

  return response;
}

export const config = {
  matcher: [
    /*
     * Everything except static assets and image optimisation. Without this
     * exclusion the auth check would also run for CSS, JS and images.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
