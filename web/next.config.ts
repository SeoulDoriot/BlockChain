import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const nextConfig: NextConfig = {
  // Pin the workspace root; without it Turbopack walks up and finds an
  // unrelated package-lock.json in the home directory.
  turbopack: {
    root: dirname(fileURLToPath(import.meta.url)),
  },

  // Cache Components: dynamic by default, opt in per function with `use cache`.
  // Also enables Partial Prerendering, so a static shell streams immediately.
  cacheComponents: true,

  cacheLife: {
    // Verification results: short-lived, and revalidated by tag the instant a
    // certificate is revoked or renewed so a stale "Valid" is never shown.
    verification: {
      stale: 30,
      revalidate: 60,
      expire: 300,
    },
    // Org and course data change roughly never.
    reference: {
      stale: 3600,
      revalidate: 86400,
      expire: 604800,
    },
  },
};

export default nextConfig;
