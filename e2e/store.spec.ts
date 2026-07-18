import { expect, test } from "@playwright/test";

test.describe("store grid", () => {
  test("renders product cards with the page heading", async ({ page }) => {
    await page.goto("/store");
    await expect(page.getByRole("heading", { name: /merch/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /PHEVE Logo Tee/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Sticker Pack/i })).toBeVisible();
  });
});

test.describe("product detail", () => {
  test("size swatches select a variant and add to cart", async ({ page }) => {
    await page.goto("/store/logo-tee");
    test.skip(
      (await page.getByText(/coming soon/i).isVisible()) ||
        (await page.getByText(/store is napping/i).isVisible()),
      "Store closed (coming soon) or unstocked — open the store / run pnpm db:setup",
    );
    // Playwright's getByRole name matching is substring-based by default, so "L" alone
    // would also match "XL" and "2XL" — exact: true pins it to the single "L" swatch.
    await page.getByRole("radio", { name: "L", exact: true }).click();
    await expect(page.getByRole("radio", { name: "L", exact: true })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await expect(page.getByRole("radio", { name: "S", exact: true })).toHaveAttribute(
      "aria-checked",
      "false",
    );
    await page.getByRole("button", { name: /add to cart/i }).click();
    // CartLink renders in both the desktop and mobile nav groups; only one is visible.
    await expect(page.getByRole("link", { name: /cart \(1\)/i }).first()).toBeVisible();
  });

  test("hides add to cart and shows coming soon while pre-launch", async ({ page }) => {
    await page.goto("/store/logo-tee");
    test.skip(
      !(await page.getByText(/coming soon/i).isVisible()),
      "Store is open — purchasing enabled",
    );
    await expect(page.getByRole("button", { name: /add to cart/i })).toHaveCount(0);
    await expect(page.getByRole("radio", { name: "L", exact: true })).toHaveCount(0);
  });
});
