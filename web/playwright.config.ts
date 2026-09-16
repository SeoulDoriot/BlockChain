import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests run against a real Polygon Amoy deployment and a real
 * Supabase project — no mocks. They need a fully populated .env.local plus
 * E2E_EMAIL / E2E_PASSWORD for a seeded staff account.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // chain writes are sequential by nature
  workers: 1,
  retries: 0,
  timeout: 180_000,
  expect: { timeout: 30_000 },
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    permissions: ["camera"],
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run start",
        url: "http://localhost:3000",
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
