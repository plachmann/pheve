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
    <main className="mx-auto max-w-3xl px-4 py-24 text-center">
      <h1 className="text-3xl font-black tracking-wide">Order in. You rule. 🤘</h1>
      <p className="mt-4 text-zinc-400">
        Stripe is emailing your receipt. We pack orders between gigs — it’ll ship soon.
      </p>
      <Link href="/" className="mt-8 inline-block underline hover:text-white">
        Back to the band
      </Link>
    </main>
  );
}
