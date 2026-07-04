"use client";

import Link from "next/link";
import { useCart } from "@/components/cart-provider";
import { cartCount } from "@/lib/cart";

export function CartLink() {
  const { items } = useCart();
  const count = cartCount(items);

  return (
    <Link href="/cart" className="hover:text-white">
      Cart{count > 0 ? ` (${count})` : ""}
    </Link>
  );
}
