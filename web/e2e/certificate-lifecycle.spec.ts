import { test, expect } from "@playwright/test";
import {
  adminClient,
  advanceChainTime,
  chainDate,
  fillWhenReady,
  issueViaForm,
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

  await issueViaForm(page, recipient, await chainDate(0), await chainDate(365));

  // Redirects to the detail page once the chain receipt lands.
  await page.waitForURL(/\/dashboard\/certificates\/[0-9a-f-]{36}/, {
    timeout: 120_000,
  });

  certificateId = page.url().split("/").pop()!;
  expect(certificateId).toMatch(/^[0-9a-f-]{36}$/);

  await expect(page.getByRole("status")).toContainText("Valid");

  // The public page agrees.
  await page.goto(`/verify/${certificateId}`);
  await expect(page.getByRole("status")).toContainText(/verified/i);
  await expect(page.getByText(recipient.name)).toBeVisible();
});

test("the blockchain transaction is shown and links to the explorer", async ({
  page,
}) => {
  await page.goto(`/verify/${certificateId}`);

  // The proof section is collapsed by default.
  await page.getByText("Blockchain Proof").click();

  const isLocal = process.env.NEXT_PUBLIC_CHAIN === "local";
  if (isLocal) {
    // A local Hardhat chain has no block explorer, so the hash is plain text.
    await expect(page.getByText(/^0x[0-9a-f]{64}$/i).first()).toBeVisible();
    await expect(page.getByText("Local test network")).toBeVisible();
  } else {
    const txLink = page.getByRole("link", { name: /^0x[0-9a-f]{64}$/i }).first();
    await expect(txLink).toHaveAttribute("href", /polygonscan\.com\/tx\/0x/);
    await expect(page.getByText("Polygon Amoy")).toBeVisible();
  }
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
  await page.getByText("Blockchain Proof").click();
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
    await expect(page.getByRole("status")).toContainText(/verified/i);
  }).toPass({ timeout: 90_000 });
});

test("revoking shows Revoked immediately, with no stale cache", async ({
  page,
}) => {
  await signIn(page);
  await page.goto(`/dashboard/certificates/${certificateId}`);

  await page.getByRole("button", { name: "Revoke Certificate" }).click();
  const dialog = page.getByRole("dialog");
  await fillWhenReady(
    dialog,
    "Reason",
    "Issued in error during e2e test",
    /revoke certificate/i,
  );
  await dialog.getByRole("button", { name: /revoke certificate/i }).click();

  await expect(page.getByRole("status")).toContainText("Revoked", {
    timeout: 120_000,
  });

  // The public page must not serve a cached "verified".
  await page.goto(`/verify/${certificateId}`);
  await expect(page.getByRole("status")).toContainText(/revoked/i);
});

test("a certificate past its expiry reads Expired, and renewing issues a valid one", async ({
  page,
}) => {
  const recipient = uniqueRecipient();

  await signIn(page);
  await page.goto("/dashboard/certificates/new");
  // Dates come from the chain clock: earlier tests move it forward, and an
  // expiry in the chain's past would be rejected by the contract.
  await issueViaForm(page, recipient, await chainDate(0), await chainDate(2));

  await page.waitForURL(/\/dashboard\/certificates\/[0-9a-f-]{36}/, {
    timeout: 120_000,
  });
  const shortLivedId = page.url().split("/").pop()!;

  await page.goto(`/verify/${shortLivedId}`);
  await expect(page.getByRole("status")).toContainText(/verified/i);

  // Move the chain clock past the expiry. The contract compares expiresAt to
  // block.timestamp on every read, so no job runs and nothing is written —
  // the certificate simply becomes Expired on its own.
  await advanceChainTime(4 * 24 * 60 * 60);

  await expect(async () => {
    await page.goto(`/verify/${shortLivedId}?t=${Date.now()}`);
    await expect(page.getByRole("status")).toContainText(/expired/i);
  }).toPass({ timeout: 90_000 });

  // Renew → a brand new certificate that is valid.
  await page.goto(`/dashboard/certificates/${shortLivedId}`);
  await fillWhenReady(page, "Renew", await chainDate(365), /^renew$/i);
  await page.getByRole("button", { name: /^renew$/i }).click();

  await page.waitForURL(
    (url) =>
      /\/dashboard\/certificates\/[0-9a-f-]{36}/.test(url.pathname) &&
      !url.pathname.endsWith(shortLivedId),
    { timeout: 120_000 },
  );

  const renewedId = page.url().split("/").pop()!;
  await page.goto(`/verify/${renewedId}`);
  await expect(page.getByRole("status")).toContainText(/verified/i);
});

test("the QR payload URL opens the verify page", async ({ page }) => {
  const appUrl = requireEnv("NEXT_PUBLIC_APP_URL");
  await page.goto(`${appUrl}/verify/${certificateId}`);
  await expect(page.getByRole("status")).toContainText(/revoked/i);
});

test("an unknown certificate id reads Not found", async ({ page }) => {
  await page.goto("/verify/00000000-0000-4000-8000-000000000000");
  await expect(page.getByRole("status")).toContainText("Not found");
});
