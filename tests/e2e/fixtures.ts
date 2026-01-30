import jwt from "jsonwebtoken";

import type { Page } from "@playwright/test";
import { test as base } from "@playwright/test";

import { deleteUserByEmail, getUserByEmail } from "./helpers/db";

export interface TestUser {
  handle: string;
  email: string;
  password: string;
}

interface AuthFixtures {
  testUser: TestUser;
  verifiedUser: TestUser;
  authenticatedPage: Page;
}

export const it = base.extend<AuthFixtures>({
  // eslint-disable-next-line no-empty-pattern
  testUser: async ({}, use) => {
    const user: TestUser = {
      handle: "testuser",
      email: "test@example.com",
      password: "testpass123",
    };
    await use(user);
  },

  verifiedUser: async ({ page, testUser }, use) => {
    await page.goto("/register");

    await page.getByLabel("Username").fill(testUser.handle);
    await page.getByLabel("Email address").fill(testUser.email);
    await page.getByLabel("Password", { exact: true }).fill(testUser.password);
    await page.getByLabel("Confirm password").fill(testUser.password);
    await page.getByLabel(/I accept the/).check();

    await page.getByRole("button", { name: "Sign up" }).click();

    await page.waitForURL("/register");
    await page.waitForSelector("text=Check your email");

    const user = await getUserByEmail(testUser.email);
    if (!user) throw new Error("User not created");

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.APP_SECRET!,
      { expiresIn: "1d" },
    );

    await page.goto(`/email-verify/${token}`);

    await page.waitForURL("/login?verified=true");

    await use(testUser);

    await deleteUserByEmail(testUser.email);
  },

  authenticatedPage: async (
    { page, verifiedUser }: { page: Page; verifiedUser: TestUser },
    use,
  ) => {
    await page.goto("/login");
    await page.getByLabel("Email address").fill(verifiedUser.email);
    await page.getByLabel("Password").fill(verifiedUser.password);
    await page.getByRole("button", { name: "Log in" }).click();

    await page.waitForURL(`/start-trial`);

    await use(page);
  },
});

export { expect } from "@playwright/test";
export const describe = base.describe;
