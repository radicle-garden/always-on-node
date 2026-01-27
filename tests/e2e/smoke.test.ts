import { expect, test } from "@playwright/test";

test("login screen shows up", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Log in", { exact: true }).first()).toBeVisible();
});
