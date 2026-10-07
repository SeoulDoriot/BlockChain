import { test, expect } from "@playwright/test";
import { chainDate, chooseCsv, signIn, uniqueRecipient } from "./helpers";

test.describe.configure({ mode: "serial" });

test("bulk issues a CSV cohort and reports per-row results", async ({ page }) => {
  const a = uniqueRecipient();
  const b = uniqueRecipient();
  const issuedOn = await chainDate(0);
  const expiresOn = await chainDate(365);

  const csv = [
    "course_code,recipient_name,recipient_email,issued_on,expires_on",
    `CS101,${a.name},${a.email},${issuedOn},${expiresOn}`,
    `CS220,${b.name},${b.email},${issuedOn},`,
  ].join("\n");

  await signIn(page);
  await page.goto("/dashboard/certificates/bulk");

  await chooseCsv(page, { name: "cohort.csv", content: csv }, /Issue 2 certificates/i);

  // Both rows parse, so the run button offers exactly two certificates.
  const runButton = page.getByRole("button", { name: /Issue 2 certificates/i });
  await expect(runButton).toBeEnabled();
  await runButton.click();

  // Each row is its own chain transaction, issued one after another.
  await expect(page.getByRole("link", { name: "Issued" })).toHaveCount(2, {
    timeout: 180_000,
  });
  await expect(page.getByText(/2 of 2 processed · 2 issued/)).toBeVisible();

  // And both are genuinely verifiable.
  const first = await page.getByRole("link", { name: "Issued" }).first().getAttribute("href");
  const id = first!.split("/").pop()!;
  await page.goto(`/verify/${id}`);
  await expect(page.getByRole("status")).toContainText(/verified/i);
  await expect(page.getByText(a.name)).toBeVisible();
});

test("refuses a file with a bad row and names the line", async ({ page }) => {
  await signIn(page);
  await page.goto("/dashboard/certificates/bulk");

  const csv = [
    "course_code,recipient_name,recipient_email,issued_on,expires_on",
    "CS101,Valid Person,valid@example.com,,",
    "NOPE404,Bad Course,bad@example.com,,",
    "CS101,No Email,,,",
  ].join("\n");

  await chooseCsv(page, { name: "bad.csv", content: csv }, /problems in the file/i);

  await expect(page.getByText(/Line 3: Unknown course "NOPE404"/)).toBeVisible();
  await expect(page.getByText(/Line 4: recipient_email is required/)).toBeVisible();

  // Nothing may be issued while the file still has problems.
  await expect(page.getByRole("button", { name: /Issue 3 certificates/i })).toBeDisabled();
});

test("rejects a file missing a required column", async ({ page }) => {
  await signIn(page);
  await page.goto("/dashboard/certificates/bulk");

  await chooseCsv(
    page,
    { name: "headers.csv", content: "course_code,recipient_name\nCS101,Sok" },
    /Missing column: recipient_email/,
  );
});
