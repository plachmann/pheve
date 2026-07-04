import type { Metadata } from "next";
import { CartView } from "@/components/cart-view";
import { loadProducts } from "@/lib/content";

export const metadata: Metadata = { title: "Cart — PHEVE" };

export default function CartPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-black tracking-wide">Cart</h1>
      <CartView products={loadProducts()} />
    </main>
  );
}
