import { describe, expect, it } from "./fixtures";
import { deleteUserByEmail } from "./helpers/db";

describe("/login page", () => {
  it("logs in with valid credentials", async ({ page, verifiedUser }) => {
    await page.goto("/login");
    await page.getByLabel("Email address").fill(verifiedUser.email);
    await page.getByLabel("Password").fill(verifiedUser.password);
    await page.getByRole("button", { name: "Log in" }).click();

    await expect(page).toHaveURL("/start-trial");

    await page.getByRole("button", { name: "T", exact: true }).click();
    await expect(page.getByText(verifiedUser.email)).toBeVisible();
  });

  it("shows an error for incorrect credentials", async ({
    page,
    verifiedUser,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Email address").fill(verifiedUser.email);
    await page.getByLabel("Password").fill("wrongpassword");
    await page.getByRole("button", { name: "Log in" }).click();

    await expect(
      page.getByText("That's the wrong username or password"),
    ).toBeVisible();
  });

  it("disables submit button when form is incomplete", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByRole("button", { name: "Log in" })).toBeDisabled();

    await page.getByLabel("Email address").fill("test@example.com");
    await expect(page.getByRole("button", { name: "Log in" })).toBeDisabled();

    await page.getByLabel("Password").fill("password123");
    await expect(page.getByRole("button", { name: "Log in" })).toBeEnabled();
  });
});

describe("/register page", () => {
  it("shows an error when email is not verified", async ({
    page,
    testUser,
  }) => {
    const unverifiedEmail = "unverified@example.com";

    try {
      await page.goto("/register");
      await page.getByLabel("Username").fill("unverified");
      await page.getByLabel("Email address").fill(unverifiedEmail);
      await page
        .getByLabel("Password", { exact: true })
        .fill(testUser.password);
      await page.getByLabel("Confirm password").fill(testUser.password);
      await page.getByLabel(/I accept the/).check();
      await page.getByRole("button", { name: "Sign up" }).click();
      await page.waitForSelector("text=Check your email");

      await page.goto("/login");
      await page.getByLabel("Email address").fill(unverifiedEmail);
      await page.getByLabel("Password").fill(testUser.password);
      await page.getByRole("button", { name: "Log in" }).click();

      await expect(
        page.getByText("Please verify your email address to login."),
      ).toBeVisible();
    } finally {
      await deleteUserByEmail(unverifiedEmail);
    }
  });
});

describe("auth", () => {
  it("redirects to /start-trial on login", async ({ authenticatedPage }) => {
    await authenticatedPage.goto("/");

    await expect(authenticatedPage).toHaveURL("/start-trial");
  });

  it("redirects to landing page on logout", async ({ authenticatedPage }) => {
    await authenticatedPage
      .getByRole("button", { name: "T", exact: true })
      .click();
    await authenticatedPage.getByRole("button", { name: "Logout" }).click();

    await expect(authenticatedPage).toHaveURL("/");
    await expect(
      authenticatedPage.getByRole("link", { name: "Get started" }),
    ).toBeVisible();
  });

  it("persists session across page reloads", async ({
    authenticatedPage,
    verifiedUser,
  }) => {
    await authenticatedPage.reload();

    await expect(authenticatedPage).toHaveURL("/start-trial");
    await authenticatedPage
      .getByRole("button", { name: "T", exact: true })
      .click();
    await expect(authenticatedPage.getByText(verifiedUser.email)).toBeVisible();
  });

  it("maintains session when navigating between pages", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto("/settings");
    await expect(authenticatedPage).toHaveURL("/settings");

    await authenticatedPage.goto("/help");
    await expect(authenticatedPage).toHaveURL("/help");

    await authenticatedPage
      .getByRole("button", { name: "T", exact: true })
      .click();
    await expect(
      authenticatedPage.getByRole("button", { name: "Logout" }),
    ).toBeVisible();
  });

  it("shows logged in user info", async ({
    authenticatedPage,
    verifiedUser,
  }) => {
    await expect(authenticatedPage).toHaveURL("/start-trial");

    await authenticatedPage
      .getByRole("button", { name: "T", exact: true })
      .click();
    await expect(authenticatedPage.getByText(verifiedUser.email)).toBeVisible();
  });

  it("allows access to settings", async ({ authenticatedPage }) => {
    await authenticatedPage.goto("/settings");

    await expect(authenticatedPage).toHaveURL("/settings");
  });

  describe("when logged out", () => {
    it("redirects to login when accessing dashboard", async ({ page }) => {
      await page.goto("/testuser");

      await expect(page).toHaveURL("/login");
    });

    it("redirects to login when accessing settings", async ({ page }) => {
      await page.goto("/settings");

      await expect(page).toHaveURL("/login");
    });
  });
});
