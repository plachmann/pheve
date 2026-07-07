import { expect, test } from "@playwright/test";

test("home shows the hero headline and stat strip links", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /played loud/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /see shows/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /hit the store/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /instagram/i }).first()).toBeVisible();
});
