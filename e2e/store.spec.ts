import { expect, test } from "@playwright/test";

test.describe("store grid", () => {
  test("renders product cards with the page heading", async ({ page }) => {
    await page.goto("/store");
    await expect(page.getByRole("heading", { name: /merch/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /PHEVE Logo Tee/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Sticker Pack/i })).toBeVisible();
  });
});
