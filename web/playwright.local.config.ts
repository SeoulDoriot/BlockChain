import base from "./playwright.config";
import { defineConfig } from "@playwright/test";

// Local-only: run the e2e suite in the installed Google Chrome.
export default defineConfig({
  ...base,
  webServer: undefined,
  projects: [{ name: "chrome", use: { channel: "chrome" } }],
  use: { ...base.use, channel: "chrome" },
});
