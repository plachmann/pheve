import { and, eq, inArray, sql } from "drizzle-orm";
import type { CartItem } from "@/lib/cart";
import type { Db } from "@/lib/db/client";
import { inventory, orders } from "@/lib/db/schema";

export type StockIssue = { slug: string; variant: string; requested: number; available: number };

export async function getAllStock(db: Db): Promise<Record<string, Record<string, number>>> {
  const rows = await db.select().from(inventory);
  const result: Record<string, Record<string, number>> = {};
  for (const row of rows) {
    result[row.productSlug] ??= {};
    result[row.productSlug]![row.variant] = row.stock;
  }
  return result;
}

export async function getStockMap(db: Db, slug: string): Promise<Record<string, number>> {
  const rows = await db.select().from(inventory).where(eq(inventory.productSlug, slug));
  const result: Record<string, number> = {};
  for (const row of rows) {
    result[row.variant] = row.stock;
  }
  return result;
}

export async function setStock(
  db: Db,
  slug: string,
  variant: string,
  stock: number,
): Promise<void> {
  await db
    .insert(inventory)
    .values({ productSlug: slug, variant, stock })
    .onConflictDoUpdate({ target: [inventory.productSlug, inventory.variant], set: { stock } });
}

export async function checkStock(db: Db, items: CartItem[]): Promise<StockIssue[]> {
  const slugs = items.map((item) => item.slug);
  const rows = await db.select().from(inventory).where(inArray(inventory.productSlug, slugs));
  const available = new Map(rows.map((row) => [`${row.productSlug}|${row.variant}`, row.stock]));

  const issues: StockIssue[] = [];
  for (const item of items) {
    const inStock = available.get(`${item.slug}|${item.variant}`) ?? 0;
    if (item.quantity > inStock) {
      issues.push({
        slug: item.slug,
        variant: item.variant,
        requested: item.quantity,
        available: inStock,
      });
    }
  }
  return issues;
}

export async function recordOrderAndDecrement(
  db: Db,
  sessionId: string,
  items: CartItem[],
): Promise<"recorded" | "duplicate"> {
  return await db.transaction(async (tx) => {
    const inserted = await tx
      .insert(orders)
      .values({ stripeSessionId: sessionId, lineItems: items })
      .onConflictDoNothing()
      .returning({ id: orders.stripeSessionId });
    if (inserted.length === 0) return "duplicate";

    for (const item of items) {
      await tx
        .update(inventory)
        .set({ stock: sql`greatest(${inventory.stock} - ${item.quantity}, 0)` })
        .where(and(eq(inventory.productSlug, item.slug), eq(inventory.variant, item.variant)));
    }
    return "recorded";
  });
}
