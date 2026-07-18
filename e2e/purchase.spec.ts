import { execFileSync } from "node:child_process";
import { expect, test } from "@playwright/test";
import { Pool } from "pg";

const stripeKey = process.env["STRIPE_SECRET_KEY"] ?? "";
const hasStripeEnv = stripeKey.startsWith("sk_test_");
const databaseUrl = process.env["DATABASE_URL"] ?? "";

async function stockOf(pool: Pool, slug: string, variant: string): Promise<number> {
  const { rows } = await pool.query<{ stock: number }>(
    "select stock from inventory where product_slug = $1 and variant = $2",
    [slug, variant],
  );
  return rows[0]?.stock ?? 0;
}

test.describe("merch purchase", () => {
  test.skip(!hasStripeEnv, "Requires test-mode Stripe env — see README (End-to-end tests)");

  test("browse → cart → Stripe Checkout session", async ({ page }) => {
    await page.goto("/store");
    test.skip(
      await page
        .getByText(/coming soon/i)
        .first()
        .isVisible(),
      "Store is in coming-soon mode — purchasing disabled",
    );
    await page.getByRole("link", { name: /PHEVE Logo Tee/i }).click();
    // getByRole name matching is substring-based, so "L" would also match "XL"/"2XL";
    // exact pins it to the single "L" swatch.
    await page.getByRole("radio", { name: "L", exact: true }).click();
    await page.getByRole("button", { name: /add to cart/i }).click();

    await page.goto("/cart");
    await expect(page.getByText("PHEVE Logo Tee")).toBeVisible();
    await page.getByRole("button", { name: /checkout/i }).click();

    // Session creation is the unit under test. Stripe now renders the card form inside a
    // cross-origin iframed Payment Element, so driving it is deliberately out of scope.
    // Reaching the hosted page with the right line item, flat-rate shipping, and tax line
    // ($25 + $8 + $0 = $33) proves createCheckoutSession built a valid session; the
    // webhook→inventory half is covered by the next test.
    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30_000 });
    await expect(page.getByText(/PHEVE Logo Tee/i).first()).toBeVisible();
    await expect(page.getByText("$33.00").first()).toBeVisible();
  });

  test("webhook records the order and decrements stock", async () => {
    // Runs the real signed-event path: `stripe trigger` fires a checkout.session.completed
    // carrying our compact cart metadata, Stripe delivers it to the CLI listener, and the
    // listener forwards it to the dev server's webhook route. Local-only prerequisite: a
    // `stripe listen --forward-to localhost:3000/api/webhooks/stripe` whose signing secret
    // matches STRIPE_WEBHOOK_SECRET must be running. See README (End-to-end tests).
    test.skip(!databaseUrl, "DATABASE_URL not loaded — cannot verify inventory decrement");

    const pool = new Pool({ connectionString: databaseUrl, max: 1 });
    try {
      const before = await stockOf(pool, "logo-tee", "L");

      execFileSync(
        "stripe",
        [
          "trigger",
          "checkout.session.completed",
          "--api-key",
          stripeKey,
          "--add",
          'checkout_session:metadata.cart=[{"s":"logo-tee","v":"L","q":1}]',
        ],
        { stdio: "pipe" },
      );

      await expect.poll(() => stockOf(pool, "logo-tee", "L"), { timeout: 20_000 }).toBe(before - 1);

      // Restore stock so the test is repeatable across runs.
      await pool.query(
        "update inventory set stock = $1 where product_slug = 'logo-tee' and variant = 'L'",
        [before],
      );
    } finally {
      await pool.end();
    }
  });
});
