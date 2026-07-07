import type { Metadata } from "next";
import { CartView } from "@/components/cart-view";
import { PageHeading } from "@/components/page-heading";
import { loadProducts } from "@/lib/content";

export const metadata: Metadata = { title: "Cart — PHEVE" };

export default function CartPage() {
  return (
    <main className="shell py-12 md:py-16">
      <PageHeading eyebrow="Your haul" title="Cart" />
      <CartView products={loadProducts()} />
    </main>
  );
}
