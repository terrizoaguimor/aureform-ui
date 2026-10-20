import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";

const executablePath =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
  (existsSync("/usr/bin/chromium-browser")
    ? "/usr/bin/chromium-browser"
    : undefined);
const suppliedBaseURL = process.env.AUREFORM_BASE_URL;
const baseURL = suppliedBaseURL || "http://127.0.0.1:3001";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  workers: 2,
  timeout: 45000,
  expect: { timeout: 10000 },
  retries: 0,
  reporter: [["list"], ["json", { outputFile: "artifacts/e2e-report.json" }]],
  use: {
    baseURL,
    reducedMotion: "reduce",
    launchOptions: { executablePath, args: ["--no-sandbox"] },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "integrations-chromium",
      testMatch: /integrations(?:-[a-z]+)?\.spec\.ts/,
      use: { viewport: { width: 1440, height: 1000 } },
    },
    {
      name: "website-chromium",
      testMatch: /website\.spec\.ts/,
      use: { viewport: { width: 1440, height: 1000 } },
    },
    {
      name: "applications-chromium",
      testMatch: /applications\.spec\.ts/,
      use: { viewport: { width: 1440, height: 1000 } },
    },
    {
      name: "desktop-chromium",
      testMatch: /flows\.spec\.ts/,
      use: { viewport: { width: 1440, height: 1000 } },
    },
    {
      name: "mobile-chromium",
      testMatch: /mobile\.spec\.ts/,
      use: { viewport: { width: 360, height: 900 } },
    },
    {
      name: "saas-chromium",
      testMatch:
        /(?:saas-setup|data-workbench|customer-detail|imports)\.spec\.ts/,
      use: { viewport: { width: 1440, height: 1000 } },
    },
  ],
  webServer: suppliedBaseURL
    ? undefined
    : {
        command: "PORT=3001 pnpm start",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 30000,
      },
});
