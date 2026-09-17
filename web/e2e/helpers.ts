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

/**
 * Advance the local Hardhat chain's clock.
 *
 * Expiry is derived from `block.timestamp` inside the contract, so the honest
 * way to test it is to move the chain forward — not to edit `expires_on` in
 * the database, which would change the canonical payload and correctly be
 * reported as tampering instead.
 */
async function rpcCall(method: string, params: unknown[] = []) {
  const rpc = process.env.RPC_URL ?? "http://127.0.0.1:8545";
  const response = await fetch(rpc, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const body = await response.json();
  if (body.error) throw new Error(`${method}: ${body.error.message}`);
  return body.result;
}

/**
 * A YYYY-MM-DD date relative to the CHAIN's clock, not the wall clock.
 *
 * Earlier tests move the chain forward to prove expiry, and a local node keeps
 * that offset. Deriving dates from the chain keeps each test re-runnable
 * regardless of how much time travel has already happened.
 */
export async function chainDate(offsetDays: number): Promise<string> {
  const block = await rpcCall("eth_getBlockByNumber", ["latest", false]);
  const seconds = Number.parseInt(block.timestamp, 16);
  const date = new Date(seconds * 1000);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

export async function advanceChainTime(seconds: number): Promise<void> {
  const rpc = process.env.RPC_URL ?? "http://127.0.0.1:8545";

  async function call(method: string, params: unknown[] = []) {
    const response = await fetch(rpc, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    });
    const body = await response.json();
    if (body.error) throw new Error(`${method}: ${body.error.message}`);
    return body.result;
  }

  await call("evm_increaseTime", [seconds]);
  await call("evm_mine");
}

/**
 * Fill a controlled input and confirm React actually took the value.
 *
 * Playwright can type into the DOM before hydration finishes, in which case
 * React's state stays empty and any control gated on it stays disabled. This
 * retries the fill until the dependent element is enabled.
 */
export async function fillWhenReady(
  page: Page,
  label: string | RegExp,
  value: string,
  enables: string | RegExp,
): Promise<void> {
  const { expect } = await import("@playwright/test");

  await expect(async () => {
    await page.getByLabel(label).fill(value);
    await expect(page.getByRole("button", { name: enables })).toBeEnabled({
      timeout: 2000,
    });
  }).toPass({ timeout: 60_000 });
}
