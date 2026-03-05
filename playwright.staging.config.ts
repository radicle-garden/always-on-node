import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import { defineConfig, devices } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({
  path: path.resolve(__dirname, "tests/e2e/.env.staging.test"),
  quiet: true,
});

export default defineConfig({
  testDir: "tests/e2e",
  testMatch: "**/*.staging.test.ts",
  fullyParallel: false,
  forbidOnly: false,
  retries: 0,
  workers: 1,
  reporter: "list",
  timeout: 120_000,
  expect: {
    timeout: 60_000,
  },

  use: {
    baseURL: process.env.STAGING_URL,
    trace: "on",
    actionTimeout: 30_000,
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
