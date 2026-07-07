"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useCart } from "@/components/cart-provider";

export default function SuccessPage() {
  const { clear } = useCart();

  useEffect(() => {
    clear();
    // clear() is stable for the life of the page; run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="shell py-24 text-center">
      <h1 className="headline-skew font-display text-5xl uppercase md:text-6xl">
        Order in. You rule. 🤘
      </h1>
      <p className="mt-4 text-zinc-400">
        Stripe is emailing your receipt. We pack orders between gigs — it’ll ship soon.
      </p>
      <Link href="/" className="btn-ghost mt-10">
        Back to the band
      </Link>
    </main>
  );
}
