import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { serverEnv } from "@/lib/env.server";

/**
 * Service-role Supabase client. BYPASSES ALL ROW-LEVEL SECURITY.
 *
 * `server-only` makes this module a build error if it is ever reached from a
 * client component — turning a catastrophic key leak into something that
 * cannot be merged.
 *
 * Held as a singleton: each createClient allocates its own fetch/auth state,
 * and there is no reason to pay that per request.
 */
const globalForSupabase = globalThis as unknown as {
  __supabaseAdmin?: SupabaseClient;
};

export function createAdminClient(): SupabaseClient {
  if (!globalForSupabase.__supabaseAdmin) {
    globalForSupabase.__supabaseAdmin = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      serverEnv.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
  }
  return globalForSupabase.__supabaseAdmin;
}
