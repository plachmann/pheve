import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { loadProducts } from "@/lib/content";
import { getDb } from "@/lib/db/client";
import { getAllStock } from "@/lib/inventory";
import { formatCents } from "@/lib/money";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Store — PHEVE" };

export default async function StorePage() {
  const products = loadProducts();

  let stock: Record<string, Record<string, number>> | null = null;
  try {
    stock = await getAllStock(getDb());
  } catch (err) {
    console.error("store stock unavailable", err);
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-3xl font-black tracking-wide">Merch</h1>
      {stock === null ? (
        <p className="mt-4 rounded-lg border border-yellow-900 bg-yellow-950/40 p-4 text-yellow-200">
          The store is napping — browsing only for now. Check back soon.
        </p>
      ) : null}
      <ul className="mt-8 grid grid-cols-2 gap-6 md:grid-cols-3">
        {products.map((product) => {
          const variants = stock?.[product.slug] ?? {};
          const soldOut = stock !== null && product.variants.every((v) => (variants[v] ?? 0) === 0);
          return (
            <li key={product.slug}>
              <Link
                href={`/store/${product.slug}`}
                className="block rounded-lg border border-zinc-800 p-4 hover:border-zinc-600"
              >
                <div className="relative h-40 w-full">
                  <Image
                    src={product.images[0] ?? "/images/pheve-logo.png"}
                    alt={product.name}
                    fill
                    className="object-contain"
                    sizes="(max-width: 768px) 50vw, 33vw"
                  />
                </div>
                <p className="mt-3 font-semibold">{product.name}</p>
                <p className="text-zinc-400">{formatCents(product.priceCents)}</p>
                {soldOut ? (
                  <p className="mt-1 text-sm font-bold uppercase text-red-400">Sold out</p>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
