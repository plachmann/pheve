import { describe, expect, it } from "vitest";
import { formatEventDate } from "@/lib/dates";

describe("formatEventDate", () => {
  it("formats YYYY-MM-DD as a long weekday date", () => {
    expect(formatEventDate("2026-10-10")).toBe("Sat, October 10, 2026");
  });

  it("does not shift the day across timezones (noon anchor)", () => {
    expect(formatEventDate("2026-01-01")).toBe("Thu, January 1, 2026");
  });
});
