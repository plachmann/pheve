import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/lib/db/client";
import { createTestDb } from "@/lib/db/test-helpers";
import { checkRateLimit } from "@/lib/rate-limit";

let db: Db;

beforeEach(async () => {
  db = await createTestDb();
});

const t0 = new Date("2026-07-04T12:00:00Z");
const later = (seconds: number) => new Date(t0.getTime() + seconds * 1000);

describe("checkRateLimit", () => {
  it("allows up to the limit within a window", async () => {
    expect(await checkRateLimit(db, "booking:1.2.3.4", 3, 3600, t0)).toBe(true);
    expect(await checkRateLimit(db, "booking:1.2.3.4", 3, 3600, later(10))).toBe(true);
    expect(await checkRateLimit(db, "booking:1.2.3.4", 3, 3600, later(20))).toBe(true);
    expect(await checkRateLimit(db, "booking:1.2.3.4", 3, 3600, later(30))).toBe(false);
  });

  it("resets after the window elapses", async () => {
    for (let i = 0; i < 3; i += 1) {
      await checkRateLimit(db, "booking:1.2.3.4", 3, 3600, t0);
    }
    expect(await checkRateLimit(db, "booking:1.2.3.4", 3, 3600, later(3601))).toBe(true);
  });

  it("tracks keys independently", async () => {
    for (let i = 0; i < 3; i += 1) {
      await checkRateLimit(db, "booking:1.2.3.4", 3, 3600, t0);
    }
    expect(await checkRateLimit(db, "booking:5.6.7.8", 3, 3600, t0)).toBe(true);
  });
});
