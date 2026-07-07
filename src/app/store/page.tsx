import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PageHeading } from "@/components/page-heading";
import { SoldOutStamp } from "@/components/sold-out-stamp";
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
    <main className="shell py-12 md:py-16">
      <PageHeading eyebrow="The merch table" title="Merch" />
      {stock === null ? (
        <p className="mt-6 border border-yellow-900 bg-yellow-950/40 p-4 text-yellow-200">
          The store is napping — browsing only for now. Check back soon.
        </p>
      ) : null}
      <ul className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4 2xl:grid-cols-5">
        {products.map((product) => {
          const variants = stock?.[product.slug] ?? {};
          const soldOut = stock !== null && product.variants.every((v) => (variants[v] ?? 0) === 0);
          return (
            <li key={product.slug}>
              <Link
                href={`/store/${product.slug}`}
                className="relative block border border-zinc-800 bg-[#111] p-4 transition-colors hover:border-pheve-red"
              >
                <div className="relative h-40 w-full">
                  <Image
                    src={product.images[0] ?? "/images/pheve-logo.png"}
                    alt={product.name}
                    fill
                    className="object-contain"
                    sizes="(max-width: 768px) 50vw, (max-width: 1536px) 25vw, 20vw"
                  />
                </div>
                <p className="mt-3 font-semibold">{product.name}</p>
                <p className="text-zinc-400">{formatCents(product.priceCents)}</p>
                {soldOut ? <SoldOutStamp /> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
