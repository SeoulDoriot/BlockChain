import { createClient } from "@supabase/supabase-js";
import type { Page } from "@playwright/test";

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is required for e2e tests. See web/README.md → End-to-end tests.`,
    );
  }
  return value;
}

/** Service-role client, used to set up and tamper with rows directly. */
export function adminClient() {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(requireEnv("E2E_EMAIL"));
  await page.getByLabel("Password").fill(requireEnv("E2E_PASSWORD"));
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 60_000 });
}

export function isoDate(offsetDays: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

export function uniqueRecipient() {
  const stamp = Date.now();
  return {
    name: `E2E Tester ${stamp}`,
    email: `e2e+${stamp}@example.com`,
  };
}
