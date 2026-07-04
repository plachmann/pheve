import { eq } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { rateLimits } from "@/lib/db/schema";

export async function checkRateLimit(
  db: Db,
  key: string,
  limit: number,
  windowSeconds: number,
  now: Date = new Date(),
): Promise<boolean> {
  const rows = await db.select().from(rateLimits).where(eq(rateLimits.key, key));
  const row = rows[0];

  const windowExpired = !row || now.getTime() - row.windowStart.getTime() >= windowSeconds * 1000;
  if (windowExpired) {
    await db
      .insert(rateLimits)
      .values({ key, count: 1, windowStart: now })
      .onConflictDoUpdate({ target: rateLimits.key, set: { count: 1, windowStart: now } });
    return true;
  }

  if (row.count < limit) {
    await db
      .update(rateLimits)
      .set({ count: row.count + 1 })
      .where(eq(rateLimits.key, key));
    return true;
  }
  return false;
}
