import { loadProducts, type Product } from "@/lib/content";
import { closeDb, getDb } from "@/lib/db/client";
import { getStockMap, setStock } from "@/lib/inventory";

const USAGE = "Usage: pnpm restock <slug> <variant> <qty>   e.g. pnpm restock logo-tee L 25";

export function parseRestockArgs(
  argv: string[],
  products: Product[],
): { slug: string; variant: string; stock: number } {
  const [slug, variant, qty] = argv;
  if (!slug || !variant || qty === undefined) throw new Error(USAGE);

  const product = products.find((p) => p.slug === slug);
  if (!product) {
    const known = products.map((p) => p.slug).join(", ");
    throw new Error(`Unknown product "${slug}". Catalog: ${known}`);
  }
  if (!product.variants.includes(variant)) {
    throw new Error(
      `Unknown variant "${variant}" for ${slug}. Variants: ${product.variants.join(", ")}`,
    );
  }
  const stock = Number(qty);
  if (!Number.isInteger(stock) || stock < 0 || stock > 10_000) {
    throw new Error(`Quantity must be an integer between 0 and 10000, got "${qty}"`);
  }
  return { slug, variant, stock };
}

async function main(): Promise<void> {
  const { slug, variant, stock } = parseRestockArgs(process.argv.slice(2), loadProducts());
  const db = getDb();
  await setStock(db, slug, variant, stock);
  const current = await getStockMap(db, slug);
  console.log(`${slug} stock is now:`, current);
  await closeDb();
}

// Only run as a CLI, not when imported by tests.
if (process.argv[1]?.endsWith("restock.ts")) {
  main().catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  });
}
