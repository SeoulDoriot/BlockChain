import { z } from "zod";

/**
 * Public environment — safe to reach the browser.
 *
 * Next.js inlines `NEXT_PUBLIC_*` variables at build time only where they are
 * referenced as a literal `process.env.NEXT_PUBLIC_X`. That is why each key is
 * written out by hand below instead of spreading `process.env`; a spread would
 * silently produce `undefined` in client bundles.
 *
 * Server-only variables live in `lib/env.server.ts`, which is guarded by
 * `server-only` so it can never be pulled into a client component.
 */
const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_CHAIN_ID: z.coerce.number().int().positive(),
  NEXT_PUBLIC_CONTRACT_ADDRESS: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, "must be a 0x-prefixed 20-byte address"),
  NEXT_PUBLIC_EXPLORER_URL: z.string().url(),
});

const parsed = publicSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_CHAIN_ID: process.env.NEXT_PUBLIC_CHAIN_ID,
  NEXT_PUBLIC_CONTRACT_ADDRESS: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS,
  NEXT_PUBLIC_EXPLORER_URL: process.env.NEXT_PUBLIC_EXPLORER_URL,
});

if (!parsed.success) {
  throw new Error(
    `Invalid public environment:\n${z.prettifyError(parsed.error)}\n` +
      `Copy .env.example to .env.local and fill it in.`,
  );
}

export const env = parsed.data;
