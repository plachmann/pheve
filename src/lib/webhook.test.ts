import { beforeEach, describe, expect, it } from "vitest";
import { serializeCartMetadata } from "@/lib/cart";
import type { Db } from "@/lib/db/client";
import { createTestDb } from "@/lib/db/test-helpers";
import { getStockMap, setStock } from "@/lib/inventory";
import { processCheckoutCompleted } from "@/lib/webhook";

let db: Db;

beforeEach(async () => {
  db = await createTestDb();
  await setStock(db, "logo-tee", "L", 5);
});

const cart = serializeCartMetadata([{ slug: "logo-tee", variant: "L", quantity: 2 }]);

describe("processCheckoutCompleted", () => {
  it("records the order and decrements stock", async () => {
    const result = await processCheckoutCompleted(db, "cs_1", cart);
    expect(result.status).toBe("recorded");
    expect(result.items).toEqual([{ slug: "logo-tee", variant: "L", quantity: 2 }]);
    expect(await getStockMap(db, "logo-tee")).toEqual({ L: 3 });
  });

  it("is idempotent on replayed events", async () => {
    await processCheckoutCompleted(db, "cs_1", cart);
    const replay = await processCheckoutCompleted(db, "cs_1", cart);
    expect(replay.status).toBe("duplicate");
    expect(await getStockMap(db, "logo-tee")).toEqual({ L: 3 });
  });

  it("throws on missing metadata", async () => {
    await expect(processCheckoutCompleted(db, "cs_2", undefined)).rejects.toThrow(/metadata/);
  });

  it("throws on malformed metadata", async () => {
    await expect(processCheckoutCompleted(db, "cs_3", "garbage")).rejects.toThrow();
  });
});
