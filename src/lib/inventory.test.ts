import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/lib/db/client";
import { createTestDb } from "@/lib/db/test-helpers";
import {
  checkStock,
  getAllStock,
  getStockMap,
  recordOrderAndDecrement,
  setStock,
} from "@/lib/inventory";

let db: Db;

beforeEach(async () => {
  db = await createTestDb();
  await setStock(db, "logo-tee", "L", 5);
  await setStock(db, "logo-tee", "M", 0);
});

describe("setStock / reads", () => {
  it("upserts and reads back", async () => {
    await setStock(db, "logo-tee", "L", 9);
    expect(await getStockMap(db, "logo-tee")).toEqual({ L: 9, M: 0 });
  });

  it("getAllStock groups by slug", async () => {
    await setStock(db, "sticker-pack", "One size", 50);
    const all = await getAllStock(db);
    expect(all["logo-tee"]).toEqual({ L: 5, M: 0 });
    expect(all["sticker-pack"]).toEqual({ "One size": 50 });
  });
});

describe("checkStock", () => {
  it("returns no issues when stock covers the cart", async () => {
    expect(await checkStock(db, [{ slug: "logo-tee", variant: "L", quantity: 5 }])).toEqual([]);
  });

  it("reports shortage with available count", async () => {
    const issues = await checkStock(db, [{ slug: "logo-tee", variant: "L", quantity: 6 }]);
    expect(issues).toEqual([{ slug: "logo-tee", variant: "L", requested: 6, available: 5 }]);
  });

  it("treats a missing inventory row as zero available", async () => {
    const issues = await checkStock(db, [{ slug: "ghost-item", variant: "L", quantity: 1 }]);
    expect(issues).toEqual([{ slug: "ghost-item", variant: "L", requested: 1, available: 0 }]);
  });
});

describe("recordOrderAndDecrement", () => {
  const items = [{ slug: "logo-tee", variant: "L", quantity: 2 }];

  it("records the order and decrements stock", async () => {
    expect(await recordOrderAndDecrement(db, "cs_1", items)).toBe("recorded");
    expect(await getStockMap(db, "logo-tee")).toEqual({ L: 3, M: 0 });
  });

  it("is idempotent: a replayed session id does not decrement twice", async () => {
    await recordOrderAndDecrement(db, "cs_1", items);
    expect(await recordOrderAndDecrement(db, "cs_1", items)).toBe("duplicate");
    expect(await getStockMap(db, "logo-tee")).toEqual({ L: 3, M: 0 });
  });

  it("floors stock at zero instead of going negative", async () => {
    await recordOrderAndDecrement(db, "cs_2", [{ slug: "logo-tee", variant: "L", quantity: 10 }]);
    expect(await getStockMap(db, "logo-tee")).toEqual({ L: 0, M: 0 });
  });
});
