import { describe, expect, it } from "vitest";
import type { Product } from "@/lib/content";
import { buildSeedRows } from "./seed";

const products: Product[] = [
  {
    slug: "logo-tee",
    name: "PHEVE Logo Tee",
    priceCents: 2500,
    description: "x",
    variants: ["S", "L"],
    images: ["/images/pheve-logo.png"],
  },
  {
    slug: "sticker-pack",
    name: "Sticker Pack",
    priceCents: 500,
    description: "x",
    variants: ["One size"],
    images: ["/images/pheve-logo.png"],
  },
];

describe("buildSeedRows", () => {
  it("creates one row per product/variant pair with the default quantity", () => {
    expect(buildSeedRows(products)).toEqual([
      { slug: "logo-tee", variant: "S", stock: 25 },
      { slug: "logo-tee", variant: "L", stock: 25 },
      { slug: "sticker-pack", variant: "One size", stock: 25 },
    ]);
  });

  it("accepts a custom quantity", () => {
    expect(buildSeedRows(products, 5)).toEqual([
      { slug: "logo-tee", variant: "S", stock: 5 },
      { slug: "logo-tee", variant: "L", stock: 5 },
      { slug: "sticker-pack", variant: "One size", stock: 5 },
    ]);
  });

  it("returns an empty array for an empty catalog", () => {
    expect(buildSeedRows([])).toEqual([]);
  });
});
