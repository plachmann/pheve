import { loadProducts, type Product } from "@/lib/content";
import { closeDb, getDb } from "@/lib/db/client";
import { setStock } from "@/lib/inventory";

const DEFAULT_SEED_STOCK = 25;

export function buildSeedRows(
  products: Product[],
  stock = DEFAULT_SEED_STOCK,
): { slug: string; variant: string; stock: number }[] {
  return products.flatMap((product) =>
    product.variants.map((variant) => ({ slug: product.slug, variant, stock })),
  );
}

async function main(): Promise<void> {
  const rows = buildSeedRows(loadProducts());
  const db = getDb();
  for (const row of rows) {
    await setStock(db, row.slug, row.variant, row.stock);
  }
  console.log(`Seeded stock for ${rows.length} product/variant pairs.`);
  await closeDb();
}

// Only run as a CLI, not when imported by tests.
if (process.argv[1]?.endsWith("seed.ts")) {
  main().catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  });
}
