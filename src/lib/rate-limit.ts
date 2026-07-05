import { sql } from "drizzle-orm";
import type { Db } from "@/lib/db/client";

/**
 * Atomically records a hit against `key` and reports whether it is within `limit`
 * for the current `windowSeconds` window.
 *
 * The increment happens in a single `INSERT ... ON CONFLICT DO UPDATE`, so Postgres
 * serializes concurrent hits on the same row: two requests can never read the same
 * count and both write count+1. The window resets in the same statement when the
 * stored `window_start` is older than the window.
 */
export async function checkRateLimit(
  db: Db,
  key: string,
  limit: number,
  windowSeconds: number,
  now: Date = new Date(),
): Promise<boolean> {
  const result = await db.execute<{ count: number }>(sql`
    INSERT INTO rate_limits (key, count, window_start)
    VALUES (${key}, 1, ${now})
    ON CONFLICT (key) DO UPDATE SET
      count = CASE
        WHEN rate_limits.window_start <= ${now}::timestamptz - make_interval(secs => ${windowSeconds})
          THEN 1
        ELSE rate_limits.count + 1
      END,
      window_start = CASE
        WHEN rate_limits.window_start <= ${now}::timestamptz - make_interval(secs => ${windowSeconds})
          THEN ${now}
        ELSE rate_limits.window_start
      END
    RETURNING count
  `);
  return (result.rows[0]?.count ?? 0) <= limit;
}
