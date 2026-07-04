import type Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCheckoutSession, FLAT_SHIPPING_CENTS } from "@/lib/checkout";
import type { Db } from "@/lib/db/client";
import { createTestDb } from "@/lib/db/test-helpers";
import { setStock } from "@/lib/inventory";

const sessionCreate = vi.fn();
const fakeStripe = {
  checkout: { sessions: { create: sessionCreate } },
} as unknown as Stripe;

let db: Db;

beforeEach(async () => {
  db = await createTestDb();
  await setStock(db, "logo-tee", "L", 5);
  sessionCreate.mockReset();
  sessionCreate.mockResolvedValue({
    id: "cs_test_1",
    url: "https://checkout.stripe.com/c/pay/cs_test_1",
  });
});

const origin = "https://pheve.com";

describe("createCheckoutSession", () => {
  it("rejects an unknown product slug", async () => {
    const result = await createCheckoutSession(
      db,
      fakeStripe,
      [{ slug: "ghost", variant: "L", quantity: 1 }],
      origin,
    );
    expect(result).toMatchObject({ ok: false, status: 400 });
    expect(sessionCreate).not.toHaveBeenCalled();
  });

  it("rejects an unknown variant", async () => {
    const result = await createCheckoutSession(
      db,
      fakeStripe,
      [{ slug: "logo-tee", variant: "XXS", quantity: 1 }],
      origin,
    );
    expect(result).toMatchObject({ ok: false, status: 400 });
  });

  it("returns 409 with issues when stock is short", async () => {
    const result = await createCheckoutSession(
      db,
      fakeStripe,
      [{ slug: "logo-tee", variant: "L", quantity: 6 }],
      origin,
    );
    expect(result).toMatchObject({
      ok: false,
      status: 409,
      issues: [{ slug: "logo-tee", variant: "L", requested: 6, available: 5 }],
    });
    expect(sessionCreate).not.toHaveBeenCalled();
  });

  it("creates a session with line items, flat shipping, tax, and cart metadata", async () => {
    const result = await createCheckoutSession(
      db,
      fakeStripe,
      [{ slug: "logo-tee", variant: "L", quantity: 2 }],
      origin,
    );
    expect(result).toEqual({ ok: true, url: "https://checkout.stripe.com/c/pay/cs_test_1" });

    const params = sessionCreate.mock.calls[0]?.[0] as Stripe.Checkout.SessionCreateParams;
    expect(params.mode).toBe("payment");
    expect(params.line_items).toEqual([
      {
        quantity: 2,
        price_data: {
          currency: "usd",
          unit_amount: 2500,
          tax_behavior: "exclusive",
          product_data: { name: "PHEVE Logo Tee — L" },
        },
      },
    ]);
    expect(params.shipping_address_collection).toEqual({ allowed_countries: ["US"] });
    expect(params.shipping_options?.[0]?.shipping_rate_data?.fixed_amount?.amount).toBe(
      FLAT_SHIPPING_CENTS,
    );
    expect(params.automatic_tax).toEqual({ enabled: true });
    expect(params.metadata?.["cart"]).toBe('[{"s":"logo-tee","v":"L","q":2}]');
    expect(params.success_url).toBe("https://pheve.com/store/success");
    expect(params.cancel_url).toBe("https://pheve.com/cart");
  });
});
