import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

/**
 * Supabase client for server components, server actions and route handlers.
 *
 * Acts as the signed-in user, so row-level security still applies. Use this
 * for everything except the few operations that genuinely need to bypass RLS
 * — those belong in `lib/supabase/admin.ts`.
 *
 * Only `getAll` / `setAll` are implemented; the older single-cookie methods
 * are removed from @supabase/ssr.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a server component, where cookies are read-only.
            // Safe to ignore: proxy.ts refreshes the session on every request,
            // so the cookie is written there instead.
          }
        },
      },
    },
  );
}
