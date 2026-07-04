import { describe, expect, it } from "vitest";
import type { Product } from "@/lib/content";
import { parseRestockArgs } from "./restock";

const products: Product[] = [
  {
    slug: "logo-tee",
    name: "PHEVE Logo Tee",
    priceCents: 2500,
    description: "x",
    variants: ["S", "L"],
    images: ["/images/pheve-logo.png"],
  },
];

describe("parseRestockArgs", () => {
  it("parses valid args", () => {
    expect(parseRestockArgs(["logo-tee", "L", "25"], products)).toEqual({
      slug: "logo-tee",
      variant: "L",
      stock: 25,
    });
  });

  it("rejects a slug not in the catalog", () => {
    expect(() => parseRestockArgs(["ghost", "L", "25"], products)).toThrow(/ghost/);
  });

  it("rejects a variant the product does not have", () => {
    expect(() => parseRestockArgs(["logo-tee", "XXL", "25"], products)).toThrow(/XXL/);
  });

  it("rejects a negative or non-numeric quantity", () => {
    expect(() => parseRestockArgs(["logo-tee", "L", "-1"], products)).toThrow(/quantity/i);
    expect(() => parseRestockArgs(["logo-tee", "L", "lots"], products)).toThrow(/quantity/i);
  });

  it("rejects missing args with a usage message", () => {
    expect(() => parseRestockArgs(["logo-tee"], products)).toThrow(/usage/i);
  });
});
