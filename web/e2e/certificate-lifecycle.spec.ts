import { test, expect } from "@playwright/test";
import {
  adminClient,
  advanceChainTime,
  isoDate,
  requireEnv,
  signIn,
  uniqueRecipient,
} from "./helpers";

/**
 * Full lifecycle against a real chain and a real database.
 *
 * issue → VALID → tamper → TAMPERED → restore → VALID → revoke → REVOKED,
 * then a near-expiry certificate → EXPIRED → renew → VALID, and finally the
 * QR route.
 *
 * Each chain write waits for a receipt, so this suite is slow by design.
 */
test.describe.configure({ mode: "serial" });

let certificateId: string;
let originalName: string;

test("issue a certificate and see it verify as Valid", async ({ page }) => {
  const recipient = uniqueRecipient();
  originalName = recipient.name;

  await signIn(page);
  await page.goto("/dashboard/certificates/new");

  await page.getByLabel("Recipient name").fill(recipient.name);
  await page.getByLabel("Recipient email").fill(recipient.email);
  await page.getByLabel("Issue date").fill(isoDate(0));
  await page.getByLabel("Expiry date").fill(isoDate(365));

  await page.getByRole("button", { name: /issue certificate/i }).click();

  // Redirects to the detail page once the chain receipt lands.
  await page.waitForURL(/\/dashboard\/certificates\/[0-9a-f-]{36}/, {
    timeout: 120_000,
  });

  certificateId = page.url().split("/").pop()!;
  expect(certificateId).toMatch(/^[0-9a-f-]{36}$/);

  await expect(page.getByRole("status")).toContainText("Valid");

  // The public page agrees.
  await page.goto(`/verify/${certificateId}`);
  await expect(page.getByRole("status")).toContainText("Valid");
  await expect(page.getByText(recipient.name)).toBeVisible();
});

test("the blockchain transaction is shown and links to the explorer", async ({
  page,
}) => {
  await page.goto(`/verify/${certificateId}`);
  const txLink = page.getByRole("link", { name: /^0x[0-9a-f]{64}$/i }).first();
  await expect(txLink).toBeVisible();

  // A local Hardhat chain has no block explorer, so the app emits a
  // `local:` sentinel instead of a URL. On Amoy it must be a real link.
  const isLocal = process.env.NEXT_PUBLIC_CHAIN === "local";
  await expect(txLink).toHaveAttribute(
    "href",
    isLocal ? /^local:tx:0x[0-9a-f]{64}$/i : /polygonscan\.com\/tx\/0x/,
  );

  await expect(page.getByText(/Polygon Amoy|31337|80002/)).toBeVisible();
});

test("tampering with the database row is detected", async ({ page }) => {
  const supabase = adminClient();

  // Edit the row behind the app's back — exactly what the anchor exists to catch.
  const { error } = await supabase
    .from("certificates")
    .update({ recipient_name: "Someone Else Entirely" })
    .eq("id", certificateId);
  expect(error).toBeNull();

  // The verification result is cached briefly, so poll until the cache turns
  // over rather than asserting on the first render.
  await expect(async () => {
    await page.goto(`/verify/${certificateId}?t=${Date.now()}`);
    await expect(page.getByRole("status")).toContainText("Tampered");
  }).toPass({ timeout: 90_000 });

  // The altered name is shown, and the recomputed hash is flagged as a mismatch.
  await expect(page.getByText("Someone Else Entirely")).toBeVisible();
  await expect(page.getByText(/✗ mismatch/)).toBeVisible();
});

test("restoring the row makes it verify as Valid again", async ({ page }) => {
  const supabase = adminClient();
  const { error } = await supabase
    .from("certificates")
    .update({ recipient_name: originalName })
    .eq("id", certificateId);
  expect(error).toBeNull();

  await expect(async () => {
    await page.goto(`/verify/${certificateId}?t=${Date.now()}`);
    await expect(page.getByRole("status")).toContainText("Valid");
  }).toPass({ timeout: 90_000 });
});

test("revoking shows Revoked immediately, with no stale cache", async ({
  page,
}) => {
  await signIn(page);
  await page.goto(`/dashboard/certificates/${certificateId}`);

  await page.getByLabel("Revoke").fill("Issued in error during e2e test");
  await page.getByRole("button", { name: /revoke certificate/i }).click();

  await expect(page.getByRole("status")).toContainText("Revoked", {
    timeout: 120_000,
  });

  // The public page must not serve a cached "Valid".
  await page.goto(`/verify/${certificateId}`);
  await expect(page.getByRole("status")).toContainText("Revoked");
});

test("a certificate past its expiry reads Expired, and renewing issues a valid one", async ({
  page,
}) => {
  const recipient = uniqueRecipient();

  await signIn(page);
  await page.goto("/dashboard/certificates/new");
  await page.getByLabel("Recipient name").fill(recipient.name);
  await page.getByLabel("Recipient email").fill(recipient.email);
  await page.getByLabel("Issue date").fill(isoDate(0));
  await page.getByLabel("Expiry date").fill(isoDate(2));
  await page.getByRole("button", { name: /issue certificate/i }).click();

  await page.waitForURL(/\/dashboard\/certificates\/[0-9a-f-]{36}/, {
    timeout: 120_000,
  });
  const shortLivedId = page.url().split("/").pop()!;

  await page.goto(`/verify/${shortLivedId}`);
  await expect(page.getByRole("status")).toContainText("Valid");

  // Move the chain clock past the expiry. The contract compares expiresAt to
  // block.timestamp on every read, so no job runs and nothing is written —
  // the certificate simply becomes Expired on its own.
  await advanceChainTime(4 * 24 * 60 * 60);

  await expect(async () => {
    await page.goto(`/verify/${shortLivedId}?t=${Date.now()}`);
    await expect(page.getByRole("status")).toContainText("Expired");
  }).toPass({ timeout: 90_000 });

  // Renew → a brand new certificate that is valid.
  await page.goto(`/dashboard/certificates/${shortLivedId}`);
  await page.getByLabel("Renew").fill(isoDate(365));
  await page.getByRole("button", { name: /^renew$/i }).click();

  await page.waitForURL(
    (url) =>
      /\/dashboard\/certificates\/[0-9a-f-]{36}/.test(url.pathname) &&
      !url.pathname.endsWith(shortLivedId),
    { timeout: 120_000 },
  );

  const renewedId = page.url().split("/").pop()!;
  await page.goto(`/verify/${renewedId}`);
  await expect(page.getByRole("status")).toContainText("Valid");
});

test("the QR payload URL opens the verify page", async ({ page }) => {
  const appUrl = requireEnv("NEXT_PUBLIC_APP_URL");
  await page.goto(`${appUrl}/verify/${certificateId}`);
  await expect(page.getByRole("heading", { name: /verification result/i })).toBeVisible();
  await expect(page.getByRole("status")).toContainText("Revoked");
});

test("an unknown certificate id reads Not found", async ({ page }) => {
  await page.goto("/verify/00000000-0000-4000-8000-000000000000");
  await expect(page.getByRole("status")).toContainText("Not found");
});
