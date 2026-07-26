import { expect, test } from "@playwright/test";

const STORAGE_KEY = "pheve-cart";
const SEEDED_CART = JSON.stringify([{ slug: "sticker-pack", variant: "One size", quantity: 2 }]);

test.describe("checkout success page", () => {
  test("clears a cart that was persisted before the page loaded", async ({ page }) => {
    // addInitScript runs before any page script on *every* navigation, so the guard
    // keeps it from re-seeding the cart if this test ever navigates again. This puts
    // the cart in localStorage before CartProvider hydrates — the state a buyer
    // returns from Stripe in.
    await page.addInitScript(
      ({ key, value }: { key: string; value: string }) => {
        if (sessionStorage.getItem("e2e-seeded")) return;
        localStorage.setItem(key, value);
        sessionStorage.setItem("e2e-seeded", "1");
      },
      { key: STORAGE_KEY, value: SEEDED_CART },
    );

    await page.goto("/store/success");
    await expect(page.getByRole("heading", { name: /order in/i })).toBeVisible();

    // localStorage is what CartProvider persists to, so it is the source of truth.
    // Assert it first: until it settles, the header still shows its pre-hydration
    // frame and any UI assertion would pass for the wrong reason.
    await expect
      .poll(() => page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY))
      .toBe("[]");

    // Header renders "Cart (2)" while items remain, plain "Cart" once empty.
    await expect(page.getByRole("link", { name: "Cart", exact: true })).toBeVisible();
  });
});
