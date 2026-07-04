import { describe, expect, it } from "vitest";
import { formatCents } from "@/lib/money";

describe("formatCents", () => {
  it("formats dollars and cents", () => {
    expect(formatCents(2500)).toBe("$25.00");
    expect(formatCents(999)).toBe("$9.99");
  });
});
