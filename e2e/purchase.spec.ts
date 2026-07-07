import { expect, test } from "@playwright/test";

const hasStripeEnv = Boolean(process.env["STRIPE_SECRET_KEY"]?.startsWith("sk_test_"));

test.describe("merch purchase", () => {
  test.skip(!hasStripeEnv, "Requires test-mode Stripe env — see Task 14 prerequisites");

  test("browse → cart → Stripe Checkout → success", async ({ page }) => {
    await page.goto("/store");
    await page.getByRole("link", { name: /PHEVE Logo Tee/i }).click();
    // Playwright's getByRole name matching is substring-based by default, so "L" alone
    // would also match "XL" and "2XL" — exact: true pins it to the single "L" swatch.
    await page.getByRole("radio", { name: "L", exact: true }).click();
    await page.getByRole("button", { name: /add to cart/i }).click();

    await page.goto("/cart");
    await expect(page.getByText("PHEVE Logo Tee")).toBeVisible();
    await page.getByRole("button", { name: /checkout/i }).click();

    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30_000 });
    await page.locator('input[name="email"]').fill("fan@example.com");
    await page.locator('input[name="shippingName"]').fill("Test Fan");
    await page.locator('input[name="shippingAddressLine1"]').fill("123 Main St");
    await page.locator('input[name="shippingLocality"]').fill("Cincinnati");
    await page.locator('input[name="shippingPostalCode"]').fill("45202");
    await page.locator('select[name="shippingAdministrativeArea"]').selectOption("OH");
    await page.locator('input[name="cardNumber"]').fill("4242 4242 4242 4242");
    await page.locator('input[name="cardExpiry"]').fill("12 / 34");
    await page.locator('input[name="cardCvc"]').fill("123");
    const billingName = page.locator('input[name="billingName"]');
    if (await billingName.isVisible()) {
      await billingName.fill("Test Fan");
    }
    await page.getByTestId("hosted-payment-submit-button").click();

    await page.waitForURL(/\/store\/success/, { timeout: 45_000 });
    await expect(page.getByText(/order in/i)).toBeVisible();
  });
});
