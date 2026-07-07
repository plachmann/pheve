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
      await page.getByText(/store is napping/i).isVisible(),
      "Requires local Postgres with seeded stock — run pnpm db:setup",
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
});
