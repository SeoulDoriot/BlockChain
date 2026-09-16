import "server-only";
import { z } from "zod";

/**
 * Server-only environment. Never imported from a client component.
 *
 * `SUPABASE_SERVICE_ROLE_KEY` bypasses every row-level security policy, and
 * `ISSUER_PRIVATE_KEY` can sign transactions. Neither may ever be prefixed
 * `NEXT_PUBLIC_`, logged, or returned from a route handler.
 */
const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  RPC_URL: z.string().url(),
  ISSUER_PRIVATE_KEY: z
    .string()
    .regex(/^0x[a-fA-F0-9]{64}$/, "must be a 0x-prefixed 32-byte private key"),

  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive(),
  SMTP_USER: z.string().min(1),
  SMTP_PASSWORD: z.string().min(1),
  SMTP_FROM: z.string().email(),

  /** Shared secret protecting the expiry-reminder cron route. */
  CRON_SECRET: z.string().min(16, "Use at least 16 characters."),
});

const parsed = serverSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(
    `Invalid server environment:\n${z.prettifyError(parsed.error)}`,
  );
}

export const serverEnv = parsed.data;
