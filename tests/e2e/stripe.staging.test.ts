/**
 * Staging smoke test for the Stripe happy path.
 *
 * Targets a real deployed staging environment with Stripe sandbox credentials.
 * Runs post-deploy only — never in the PR suite.
 *
 * Requires tests/e2e/.env.staging.test (see .env.staging.test.example).
 */
import { drizzle } from "drizzle-orm/postgres-js";
import jwt from "jsonwebtoken";
import postgres from "postgres";
import Stripe from "stripe";

import { expect, test } from "@playwright/test";

import * as schema from "../../src/lib/server/db/schema";
import {
  deleteStripeDataByUserId,
  getStripeCustomerIdByEmail,
  getUserByEmail,
  softDeleteNodesByUserId,
  softDeleteUserById,
} from "../helpers/db";
import { buildStripeClientConfig } from "../helpers/stripe";

const TEST_EMAIL = "staging-smoke@radicle.garden";
const TEST_HANDLE = "stagingtest";
const TEST_PASSWORD = "TestPassword123!";

// Single shared connection — created once for the whole test file.
const stagingClient = postgres(process.env.STAGING_DB_URL!);
const db = drizzle(stagingClient, { schema });

const stripeClient = new Stripe(
  process.env.STRIPE_SECRET_SERVER_SIDE_KEY!,
  buildStripeClientConfig(),
);

/**
 * Clean up the dedicated test user from the staging DB.
 * - Stripe records (no `deleted` column): hard-deleted.
 * - User and node records: soft-deleted (project convention).
 * Called in both beforeAll (to clear leftover state) and afterAll (teardown).
 */
async function cleanupTestUser() {
  const user = await getUserByEmail(db, TEST_EMAIL);
  if (!user) return;

  await deleteStripeDataByUserId(db, user.id);
  await softDeleteNodesByUserId(db, user.id);
  await softDeleteUserById(db, user.id);
}

// Remove any leftover state from a previous failed run before starting.
test.beforeAll(async () => {
  await cleanupTestUser();
});

test.afterAll(async () => {
  // Cancel active Stripe subscriptions via API.
  // The staging server's webhook will receive the cancellation and stop containers.
  try {
    const customerId = await getStripeCustomerIdByEmail(db, TEST_EMAIL);
    if (customerId) {
      const subscriptions = await stripeClient.subscriptions.list({
        customer: customerId,
        status: "all",
        limit: 10,
      });
      for (const sub of subscriptions.data) {
        if (sub.status !== "canceled") {
          await stripeClient.subscriptions.cancel(sub.id);
        }
      }
    }
  } catch (err) {
    console.warn("Failed to cancel Stripe subscription during teardown:", err);
  }

  // Soft-delete the test user and related records from the staging DB.
  try {
    await cleanupTestUser();
  } catch (err) {
    console.warn("Failed to clean up staging test user during teardown:", err);
  }
});

test("Stripe happy path: register → verify → subscribe → node running", async ({
  page,
}) => {
  // Step 1: Register
  await page.goto("/register");
  await page.getByLabel("Name your node").fill(TEST_HANDLE);
  await page.getByLabel("Email address").fill(TEST_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(TEST_PASSWORD);
  await page.getByLabel("Confirm password").fill(TEST_PASSWORD);
  await page.getByLabel(/I accept the/).check();
  await page.getByRole("button", { name: "Sign up" }).click();

  await page.waitForURL("/register");
  await page.waitForSelector("text=Check your email");

  // Step 2: Programmatically verify email via JWT (bypass email delivery)
  const user = await getUserByEmail(db, TEST_EMAIL);
  if (!user) throw new Error("User not found in staging DB after registration");

  const token = jwt.sign(
    { id: user.id, email: user.email },
    process.env.APP_SECRET!,
    { expiresIn: "1d" },
  );

  await page.goto(`/email-verify/${token}`);
  await page.waitForURL("/login?verified=true");

  // Step 3: Log in
  await page.goto("/login");
  await page.getByLabel("Email address").fill(TEST_EMAIL);
  await page.getByLabel("Password").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();

  await page.waitForURL("/start-trial");

  // Step 4: Click subscribe button on /start-trial
  await page.getByRole("button", { name: /Start your.*free trial/i }).click();

  // Step 5: Wait for navigation to Stripe Checkout (hosted page on checkout.stripe.com)
  await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30_000 });

  // Step 6: Fill in Stripe test card details.
  // Stripe's hosted Checkout renders card fields directly on the page (not inside iframes).
  // These selectors target Stripe's Checkout form as of early 2026; update if Stripe
  // changes its Checkout UI.
  await page.waitForSelector('input[name="cardNumber"]', { timeout: 30_000 });
  await page.fill('input[name="cardNumber"]', "4242 4242 4242 4242");
  await page.fill('input[name="cardExpiry"]', "12 / 28");
  await page.fill('input[name="cardCvc"]', "424");

  const nameField = page.locator('input[name="billingName"]');
  if (await nameField.isVisible()) {
    await nameField.fill("Test User");
  }

  // Step 7: Submit payment
  await page
    .getByRole("button", { name: /Subscribe|Pay|Start|Confirm/i })
    .click();

  // Step 8: Wait for redirect back to the app
  await page.waitForURL(url => url.hostname !== "checkout.stripe.com", {
    timeout: 60_000,
  });

  // Step 9: Wait up to 60 seconds for "running" to appear on the dashboard
  // (indicates the webhook was processed and containers are started)
  await page.waitForURL(/\/dashboard/, { timeout: 30_000 });
  await expect(page.getByText("running")).toBeVisible({ timeout: 60_000 });
});
