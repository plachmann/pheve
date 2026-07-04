import Image from "next/image";
import { notFound } from "next/navigation";
import { AddToCart } from "@/components/add-to-cart";
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

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <div className="relative h-72 w-full">
        <Image
          src={product.images[0] ?? "/images/pheve-logo.png"}
          alt={product.name}
          fill
          priority
          className="object-contain"
          sizes="(max-width: 768px) 100vw, 768px"
        />
      </div>
      <h1 className="mt-6 text-3xl font-black tracking-wide">{product.name}</h1>
      <p className="mt-1 text-xl text-zinc-400">{formatCents(product.priceCents)}</p>
      <p className="mt-4 text-zinc-300">{product.description}</p>
      {stock === null ? (
        <p className="mt-6 rounded-lg border border-yellow-900 bg-yellow-950/40 p-4 text-yellow-200">
          The store is napping — you can’t buy right now. Check back soon.
        </p>
      ) : (
        <AddToCart product={product} stock={stock} />
      )}
    </main>
  );
}
