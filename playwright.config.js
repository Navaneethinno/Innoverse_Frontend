import { defineConfig } from "@playwright/test";

// Browser tests against UAT through the local dev server. Password from the
// E2E_PASSWORD environment variable. They run one at a time: UAT is shared.
export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  timeout: 90000,
  use: {
    baseURL: "http://localhost:5173",
    channel: "chrome",
    viewport: { width: 1440, height: 1000 },
    screenshot: "only-on-failure",
  },
  webServer: { command: "npm run dev", url: "http://localhost:5173", reuseExistingServer: true },
  reporter: "list",
});
