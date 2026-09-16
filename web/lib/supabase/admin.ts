import "server-only";

import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { serverEnv } from "@/lib/env.server";

/**
 * Service-role Supabase client. BYPASSES ALL ROW-LEVEL SECURITY.
 *
 * The `server-only` import above makes this module a build error if it is ever
 * reached from a client component, which is the whole point: leaking this key
 * to the browser would hand every visitor full read/write access to every
 * row in the database.
 *
 * Use it only where RLS genuinely cannot express the operation — signing
 * storage URLs, writing audit rows, the seed script. Everything a signed-in
 * member of staff does should go through `lib/supabase/server.ts` instead.
 */
export function createAdminClient() {
  return createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
