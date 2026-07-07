import { notFound } from "next/navigation";
import { AddToCart } from "@/components/add-to-cart";
import { ProductGallery } from "@/components/product-gallery";
import { SoldOutStamp } from "@/components/sold-out-stamp";
import { getProduct } from "@/lib/content";
import { getDb } from "@/lib/db/client";
import { getStockMap } from "@/lib/inventory";
import { formatCents } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) notFound();

  let stock: Record<string, number> | null = null;
  try {
    stock = await getStockMap(getDb(), slug);
  } catch (err) {
    console.error(`stock unavailable for ${slug}`, err);
  }

  const allSoldOut = stock !== null && product.variants.every((v) => (stock[v] ?? 0) === 0);

  return (
    <main className="shell py-12 md:py-16">
      <div className="grid gap-10 lg:grid-cols-2">
        <ProductGallery images={product.images} name={product.name} />
        <div className="lg:sticky lg:top-8 lg:self-start">
          <p className="eyebrow">Merch</p>
          <h1 className="headline-skew mt-2 font-display text-4xl uppercase md:text-5xl">
            {product.name}
          </h1>
          <p className="mt-3 text-2xl text-zinc-300">{formatCents(product.priceCents)}</p>
          {allSoldOut ? <SoldOutStamp className="mt-4 inline-block" /> : null}
          <p className="mt-4 max-w-xl text-zinc-400">{product.description}</p>
          {stock === null ? (
            <p className="mt-6 border border-yellow-900 bg-yellow-950/40 p-4 text-yellow-200">
              The store is napping — you can’t buy right now. Check back soon.
            </p>
          ) : (
            <AddToCart product={product} stock={stock} />
          )}
        </div>
      </div>
    </main>
  );
}
