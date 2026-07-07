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
    <div className="mt-8">
      {product.variants.length > 1 ? (
        <fieldset>
          <legend className="eyebrow text-xs">Size</legend>
          <div role="radiogroup" aria-label="Size" className="mt-3 flex flex-wrap gap-2">
            {product.variants.map((v) => {
              const out = (stock[v] ?? 0) === 0;
              const selected = v === variant;
              return (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={out}
                  onClick={() => setVariant(v)}
                  className={`min-h-11 min-w-11 border-2 px-3 py-2 font-bold uppercase ${
                    selected
                      ? "border-pheve-red bg-pheve-red text-white"
                      : "border-zinc-700 text-zinc-200 hover:border-zinc-400"
                  } disabled:cursor-not-allowed disabled:opacity-30 disabled:line-through`}
                >
                  {v}
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : null}
      <button type="button" disabled={!available} onClick={handleAdd} className="btn-primary mt-6">
        {available ? (added ? "Added ✓" : "Add to cart") : "Sold out"}
      </button>
    </div>
  );
}
