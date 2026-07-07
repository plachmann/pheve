"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/components/cart-provider";
import { cartSubtotalCents } from "@/lib/cart";
import type { Product } from "@/lib/content";
import { formatCents } from "@/lib/money";

export function CartView({ products }: { products: Product[] }) {
  const { items, remove, setQty } = useCart();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Drop lines for products no longer in the catalog (stale localStorage).
  const validItems = items.filter((line) => products.some((p) => p.slug === line.slug));

  if (validItems.length === 0) {
    return (
      <p className="mt-8 text-zinc-500">
        Your cart is empty.{" "}
        <Link href="/store" className="underline hover:text-white">
          Hit the store
        </Link>
        .
      </p>
    );
  }

  async function checkout() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: validItems }),
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (res.ok && data.url) {
        window.location.assign(data.url);
        return;
      }
      setError(data.error ?? "Checkout isn't available right now — try again shortly.");
    } catch {
      setError("Checkout isn't available right now — try again shortly.");
    }
    setBusy(false);
  }

  return (
    <div className="mt-10 grid items-start gap-10 lg:grid-cols-[1fr_24rem]">
      <ul className="space-y-4">
        {validItems.map((line) => {
          const product = products.find((p) => p.slug === line.slug);
          if (!product) return null;
          return (
            <li
              key={`${line.slug}-${line.variant}`}
              className={
                "flex flex-wrap items-center justify-between gap-4 border " +
                "border-zinc-800 bg-[#111] p-4"
              }
            >
              <div>
                <p className="font-semibold">{product.name}</p>
                <p className="text-sm text-zinc-400">
                  {line.variant} · {formatCents(product.priceCents)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  className="h-11 w-11 border border-zinc-700 hover:bg-zinc-800"
                  onClick={() => setQty(line.slug, line.variant, line.quantity - 1)}
                >
                  −
                </button>
                <span className="w-6 text-center">{line.quantity}</span>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  className="h-11 w-11 border border-zinc-700 hover:bg-zinc-800"
                  onClick={() => setQty(line.slug, line.variant, line.quantity + 1)}
                >
                  +
                </button>
                <button
                  type="button"
                  className="ml-2 text-sm text-zinc-500 underline hover:text-white"
                  onClick={() => remove(line.slug, line.variant)}
                >
                  Remove
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <aside className="border border-zinc-800 bg-[#111] p-6 lg:sticky lg:top-8">
        <h2 className="font-display text-2xl uppercase">Order summary</h2>
        <dl className="mt-4 flex items-center justify-between text-lg">
          <dt className="text-zinc-400">Subtotal</dt>
          <dd className="font-bold">{formatCents(cartSubtotalCents(validItems, products))}</dd>
        </dl>
        <p className="mt-2 text-sm text-zinc-500">Flat-rate US shipping added at checkout.</p>
        <button
          type="button"
          disabled={busy}
          onClick={checkout}
          className="btn-primary mt-6 w-full"
        >
          {busy ? "Heading to checkout…" : "Checkout"}
        </button>
        {error ? <p className="mt-4 text-red-400">{error}</p> : null}
      </aside>
    </div>
  );
}
