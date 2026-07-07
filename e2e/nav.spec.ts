import { expect, test } from "@playwright/test";

test.describe("mobile nav", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("hamburger opens the menu and navigates", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#mobile-menu")).toHaveCount(0);
    await page.getByRole("button", { name: /open menu/i }).click();
    await page.locator("#mobile-menu").getByRole("link", { name: "Shows" }).click();
    await expect(page).toHaveURL(/\/shows$/);
  });
});

test.describe("desktop nav", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("shows inline links and no hamburger", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: /open menu/i })).toBeHidden();
    await expect(page.getByRole("navigation").getByRole("link", { name: "Store" })).toBeVisible();
  });
});
