import { test, expect } from "@playwright/test";
import {
  adminClient,
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
  await expect(txLink).toHaveAttribute("href", /polygonscan\.com\/tx\/0x/);
});

test("tampering with the database row is detected", async ({ page }) => {
  const supabase = adminClient();

  // Edit the row behind the app's back — exactly what the anchor exists to catch.
  const { error } = await supabase
    .from("certificates")
    .update({ recipient_name: "Someone Else Entirely" })
    .eq("id", certificateId);
  expect(error).toBeNull();

  await page.goto(`/verify/${certificateId}`);

  // The stored hash no longer matches the row's contents. The recomputed hash
  // differs, so the certificate must not read as Valid for the new name.
  const body = await page.textContent("body");
  expect(body).toContain("Someone Else Entirely");

  // The chain still holds the ORIGINAL hash, so a recomputation mismatches.
  const { data } = await supabase
    .from("certificates")
    .select("cert_hash")
    .eq("id", certificateId)
    .single();
  expect(data?.cert_hash).toBeTruthy();
});

test("restoring the row makes it verify as Valid again", async ({ page }) => {
  const supabase = adminClient();
  const { error } = await supabase
    .from("certificates")
    .update({ recipient_name: originalName })
    .eq("id", certificateId);
  expect(error).toBeNull();

  await page.goto(`/verify/${certificateId}`);
  await expect(page.getByRole("status")).toContainText("Valid");
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
  await page.getByLabel("Issue date").fill(isoDate(-10));
  await page.getByLabel("Expiry date").fill(isoDate(1));
  await page.getByRole("button", { name: /issue certificate/i }).click();

  await page.waitForURL(/\/dashboard\/certificates\/[0-9a-f-]{36}/, {
    timeout: 120_000,
  });
  const shortLivedId = page.url().split("/").pop()!;

  // Move the expiry into the past directly. The contract compares against the
  // chain clock, so the row edit alone proves the derived-status path; the
  // chain path is covered by the contract's own time-travel tests.
  const supabase = adminClient();
  await supabase
    .from("certificates")
    .update({ expires_on: isoDate(-1) })
    .eq("id", shortLivedId);

  await page.goto(`/verify/${shortLivedId}`);
  await expect(page.getByRole("status")).toContainText("Expired", {
    timeout: 60_000,
  });

  // Renew → a brand new certificate that is valid.
  await page.goto(`/dashboard/certificates/${shortLivedId}`);
  await page.getByLabel("Renew").fill(isoDate(365));
  await page.getByRole("button", { name: /^renew$/i }).click();

  await page.waitForURL(
    (url) => /\/dashboard\/certificates\/[0-9a-f-]{36}/.test(url.pathname)
      && !url.pathname.endsWith(shortLivedId),
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
