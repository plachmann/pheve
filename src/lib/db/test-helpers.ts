import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import type { Db } from "@/lib/db/client";
import * as schema from "@/lib/db/schema";

export async function createTestDb(): Promise<Db> {
  const pglite = new PGlite();
  const db = drizzle(pglite, { schema });
  await migrate(db, { migrationsFolder: "drizzle" });
  // PgliteDatabase and NodePgDatabase share the PgDatabase base class and are
  // runtime-compatible for every query we issue; the cast bridges the driver generics.
  return db as unknown as Db;
}
