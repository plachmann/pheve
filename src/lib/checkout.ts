import type Stripe from "stripe";
import { z } from "zod";
import {
  cartItemSchema,
  MAX_DISTINCT_ITEMS,
  serializeCartMetadata,
  type CartItem,
} from "@/lib/cart";
import { loadProducts } from "@/lib/content";
import type { Db } from "@/lib/db/client";
import { checkStock, type StockIssue } from "@/lib/inventory";

export const FLAT_SHIPPING_CENTS = 800;

export const checkoutRequestSchema = z.object({
  items: z.array(cartItemSchema).min(1).max(MAX_DISTINCT_ITEMS),
});

export type CheckoutResult =
  | { ok: true; url: string }
  | { ok: false; status: 400 | 409; error: string; issues?: StockIssue[] };

export async function createCheckoutSession(
  db: Db,
  stripe: Stripe,
  items: CartItem[],
  origin: string,
): Promise<CheckoutResult> {
  const products = loadProducts();

  for (const item of items) {
    const product = products.find((p) => p.slug === item.slug);
    if (!product) {
      return { ok: false, status: 400, error: `Unknown product: ${item.slug}` };
    }
    if (!product.variants.includes(item.variant)) {
      return { ok: false, status: 400, error: `Unknown variant ${item.variant} for ${item.slug}` };
    }
  }

  const issues = await checkStock(db, items);
  if (issues.length > 0) {
    return {
      ok: false,
      status: 409,
      error: "Some items in your cart just sold out — adjust quantities and try again",
      issues,
    };
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: items.map((item) => {
      const product = products.find((p) => p.slug === item.slug);
      if (!product) throw new Error(`unreachable: ${item.slug} validated above`);
      return {
        quantity: item.quantity,
        price_data: {
          currency: "usd",
          unit_amount: product.priceCents,
          tax_behavior: "exclusive",
          product_data: { name: `${product.name} — ${item.variant}` },
        },
      };
    }),
    shipping_address_collection: { allowed_countries: ["US"] },
    shipping_options: [
      {
        shipping_rate_data: {
          type: "fixed_amount",
          display_name: "USPS flat rate",
          fixed_amount: { amount: FLAT_SHIPPING_CENTS, currency: "usd" },
        },
      },
    ],
    automatic_tax: { enabled: true },
    metadata: { cart: serializeCartMetadata(items) },
    success_url: `${origin}/store/success`,
    cancel_url: `${origin}/cart`,
  });

  if (!session.url) {
    return { ok: false, status: 400, error: "Stripe did not return a checkout URL" };
  }
  return { ok: true, url: session.url };
}
