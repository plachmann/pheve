import { describe, expect, it } from "vitest";
import {
  addItem,
  cartCount,
  cartSubtotalCents,
  MAX_QUANTITY,
  parseCartMetadata,
  removeItem,
  serializeCartMetadata,
  setQuantity,
  type CartItem,
} from "@/lib/cart";
import type { Product } from "@/lib/content";

const tee: CartItem = { slug: "logo-tee", variant: "L", quantity: 1 };

const products: Product[] = [
  {
    slug: "logo-tee",
    name: "PHEVE Logo Tee",
    priceCents: 2500,
    description: "x",
    variants: ["L"],
    images: ["/images/pheve-logo.png"],
  },
];

describe("addItem", () => {
  it("adds a new line", () => {
    expect(addItem([], tee)).toEqual([tee]);
  });

  it("merges quantities for the same slug+variant", () => {
    expect(addItem([tee], { ...tee, quantity: 2 })).toEqual([{ ...tee, quantity: 3 }]);
  });

  it("caps merged quantity at MAX_QUANTITY", () => {
    const cart = addItem([{ ...tee, quantity: MAX_QUANTITY }], tee);
    expect(cart).toEqual([{ ...tee, quantity: MAX_QUANTITY }]);
  });

  it("treats a different variant as a separate line", () => {
    expect(addItem([tee], { ...tee, variant: "M" })).toHaveLength(2);
  });
});

describe("removeItem / setQuantity", () => {
  it("removes a line", () => {
    expect(removeItem([tee], "logo-tee", "L")).toEqual([]);
  });

  it("sets quantity", () => {
    expect(setQuantity([tee], "logo-tee", "L", 4)).toEqual([{ ...tee, quantity: 4 }]);
  });

  it("removes the line when quantity drops to zero", () => {
    expect(setQuantity([tee], "logo-tee", "L", 0)).toEqual([]);
  });
});

describe("totals", () => {
  it("counts items across lines", () => {
    expect(cartCount([tee, { slug: "hat", variant: "One size", quantity: 2 }])).toBe(3);
  });

  it("computes the subtotal", () => {
    expect(cartSubtotalCents([{ ...tee, quantity: 3 }], products)).toBe(7500);
  });

  it("throws on an unknown slug", () => {
    expect(() => cartSubtotalCents([{ ...tee, slug: "ghost" }], products)).toThrow(/ghost/);
  });
});

describe("cart metadata round-trip", () => {
  it("serializes compactly and parses back", () => {
    const items = [tee, { slug: "sticker-pack", variant: "One size", quantity: 2 }];
    expect(parseCartMetadata(serializeCartMetadata(items))).toEqual(items);
  });

  it("stays under Stripe's 500-char metadata limit at max cart size", () => {
    const items = Array.from({ length: 10 }, (_, i) => ({
      slug: `item-${i}`,
      variant: "One size",
      quantity: 10,
    }));
    expect(serializeCartMetadata(items).length).toBeLessThan(500);
  });

  it("throws rather than silently truncating an oversized cart", () => {
    const items = Array.from({ length: 10 }, (_, i) => ({
      slug: `absurdly-long-product-slug-that-nobody-should-use-${i}`,
      variant: "One size",
      quantity: 10,
    }));
    expect(() => serializeCartMetadata(items)).toThrow(/metadata/i);
  });

  it("throws on malformed metadata", () => {
    expect(() => parseCartMetadata("not json")).toThrow();
    expect(() => parseCartMetadata('[{"s":"x"}]')).toThrow();
  });
});
