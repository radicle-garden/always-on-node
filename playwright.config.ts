import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import { defineConfig, devices } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, ".env.test"), quiet: true });

const webserverPort = parseInt(process.env.PLAYWRIGHT_WEBSERVER_PORT || "3000");

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 1,
  reporter: "list",
  timeout: 30_000,
  expect: {
    timeout: 8000,
  },

  use: {
    baseURL: `http://localhost:${webserverPort}`,
    trace: "on-first-retry",
    actionTimeout: 5000,
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    command: "pnpm run build && pnpm run preview",
    port: webserverPort,
    reuseExistingServer: false,
  },
});
