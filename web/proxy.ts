import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { env } from "@/lib/env";

/**
 * Runs before every matched request (Next.js 16 renamed Middleware to Proxy).
 *
 * Two jobs:
 *   1. Refresh the Supabase session so the auth cookie does not go stale.
 *   2. Bounce unauthenticated visitors away from /dashboard/*.
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
