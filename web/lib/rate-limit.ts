import "server-only";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Fixed-window rate limiting backed by Postgres (see 0002_rate_limits.sql).
 *
 * No Redis, no third-party service. The increment happens inside a single
 * SQL statement so concurrent requests cannot both read a stale count.
 */

export interface RateLimitResult {
  ok: boolean;
  count: number;
  limit: number;
  retryAfterSeconds: number;
}

export async function clientIdentifier(): Promise<string> {
  const h = await headers();
  // x-forwarded-for is a comma-separated chain; the first entry is the client.
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return h.get("x-real-ip") ?? "unknown";
}

export async function consumeRateLimit(
  bucket: string,
  limit: number,
  windowSeconds: number,
  identifier?: string,
): Promise<RateLimitResult> {
  const id = identifier ?? (await clientIdentifier());
  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc("consume_rate_limit", {
    p_bucket: bucket,
    p_identifier: id,
    p_window_seconds: windowSeconds,
  });

  if (error) {
    // Fail open rather than take the whole public page down if the limiter
    // breaks — but say so loudly.
    console.error("[rate-limit] rpc failed:", error.message);
    return { ok: true, count: 0, limit, retryAfterSeconds: 0 };
  }

  const count = typeof data === "number" ? data : 0;

  return {
    ok: count <= limit,
    count,
    limit,
    retryAfterSeconds: windowSeconds,
  };
}

export function rateLimitResponse(result: RateLimitResult): Response {
  return new Response(
    JSON.stringify({
      error: "Too many requests. Please slow down.",
      retryAfterSeconds: result.retryAfterSeconds,
    }),
    {
      status: 429,
      headers: {
        "content-type": "application/json",
        "retry-after": String(result.retryAfterSeconds),
      },
    },
  );
}
