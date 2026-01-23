import dotenv from "dotenv";

import { defineConfig, devices } from "@playwright/test";

dotenv.config({ path: ".env.test", quiet: true });

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 1,
  reporter: "list",

  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    command: "pnpm run build && pnpm run preview",
    port: 3000,
    reuseExistingServer: false,
  },
});
