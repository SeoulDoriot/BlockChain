import { test, expect } from "@playwright/test";

test("the landing lookup form works without JavaScript", async ({ browser }) => {
  // The form is plain HTML on purpose — prove it, by turning JS off entirely.
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();

  await page.goto("/");
  await page.getByLabel(/Certificate ID|លេខសម្គាល់/).fill("not-a-real-id");
  await page.getByRole("button", { name: /Verify|ផ្ទៀងផ្ទាត់/ }).click();

  await page.waitForURL(/\/verify\/not-a-real-id/);
  await expect(page.getByRole("status")).toContainText(/Not found|រកមិនឃើញ/);

  await context.close();
});

test("the language toggle switches to Khmer and back, without JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();

  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Certificate verification",
  );

  await page.getByRole("button", { name: "ភាសាខ្មែរ" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "ការផ្ទៀងផ្ទាត់វិញ្ញាបនបត្រ",
  );

  await page.getByRole("button", { name: "English" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Certificate verification",
  );

  await context.close();
});

test("the verify page offers LinkedIn and share actions", async ({ page, request }) => {
  const health = await request.get("/api/health");
  expect(health.ok()).toBeTruthy();

  // Any issued certificate will do.
  await page.goto("/");
  const id = process.env.E2E_SAMPLE_CERT;
  test.skip(!id, "E2E_SAMPLE_CERT not set");

  await page.goto(`/verify/${id}`);

  const addToProfile = page.getByRole("link", { name: /Add to LinkedIn profile/i });
  await expect(addToProfile).toBeVisible();

  const href = await addToProfile.getAttribute("href");
  expect(href).toContain("linkedin.com/profile/add");
  expect(href).toContain("startTask=CERTIFICATION_NAME");
  expect(href).toContain("certUrl=");
  // The recipient's email must never leave in a share URL.
  expect(href).not.toMatch(/@/);
});
