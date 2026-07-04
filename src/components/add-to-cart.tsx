"use client";

import { useState } from "react";
import { useCart } from "@/components/cart-provider";
import type { Product } from "@/lib/content";

export function AddToCart({ product, stock }: { product: Product; stock: Record<string, number> }) {
  const { add } = useCart();
  const [variant, setVariant] = useState(product.variants[0] ?? "");
  const [added, setAdded] = useState(false);

  const available = (stock[variant] ?? 0) > 0;

  function handleAdd() {
    add({ slug: product.slug, variant, quantity: 1 });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <div className="mt-6">
      {product.variants.length > 1 ? (
        <label className="block">
          <span className="text-sm uppercase tracking-widest text-zinc-500">Size</span>
          <select
            value={variant}
            onChange={(e) => setVariant(e.target.value)}
            className="mt-1 block rounded border border-zinc-700 bg-zinc-900 px-3 py-2"
          >
            {product.variants.map((v) => (
              <option key={v} value={v} disabled={(stock[v] ?? 0) === 0}>
                {v}
                {(stock[v] ?? 0) === 0 ? " — sold out" : ""}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <button
        type="button"
        disabled={!available}
        onClick={handleAdd}
        className="mt-4 rounded-lg bg-white px-6 py-3 font-bold text-black hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {available ? (added ? "Added ✓" : "Add to cart") : "Sold out"}
      </button>
    </div>
  );
}
