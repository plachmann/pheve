import { describe, expect, it } from "vitest";
import {
  eventSchema,
  loadEvents,
  loadGallery,
  loadProducts,
  productSchema,
  upcomingEvents,
  type BandEvent,
} from "@/lib/content";

const show = (date: string): BandEvent => ({
  date,
  venue: "Test Venue",
  city: "Cincinnati, OH",
  time: "8:00 PM",
});

describe("eventSchema", () => {
  it("rejects a malformed date", () => {
    expect(eventSchema.safeParse(show("July 18")).success).toBe(false);
  });

  it("rejects an empty venue", () => {
    expect(eventSchema.safeParse({ ...show("2026-07-18"), venue: "" }).success).toBe(false);
  });

  it("accepts a valid event with an optional link", () => {
    const result = eventSchema.safeParse({ ...show("2026-07-18"), link: "https://example.com" });
    expect(result.success).toBe(true);
  });
});

describe("productSchema", () => {
  const product = {
    slug: "logo-tee",
    name: "PHEVE Logo Tee",
    priceCents: 2500,
    description: "Black tee.",
    variants: ["S", "M"],
    images: ["/images/pheve-logo.png"],
  };

  it("rejects a non-positive price", () => {
    expect(productSchema.safeParse({ ...product, priceCents: 0 }).success).toBe(false);
  });

  it("rejects an uppercase slug", () => {
    expect(productSchema.safeParse({ ...product, slug: "Logo Tee" }).success).toBe(false);
  });

  it("rejects an empty variants list", () => {
    expect(productSchema.safeParse({ ...product, variants: [] }).success).toBe(false);
  });
});

describe("upcomingEvents", () => {
  // Noon UTC on 2026-07-10 is 2026-07-10 in America/New_York.
  const now = new Date("2026-07-10T12:00:00Z");

  it("keeps today, drops yesterday, sorts ascending", () => {
    const events = [show("2026-08-01"), show("2026-07-09"), show("2026-07-10")];
    expect(upcomingEvents(events, now).map((e) => e.date)).toEqual(["2026-07-10", "2026-08-01"]);
  });

  it("returns empty for no upcoming shows", () => {
    expect(upcomingEvents([show("2026-01-01")], now)).toEqual([]);
  });
});

describe("loaders", () => {
  it("load the seed content files", () => {
    expect(loadEvents().length).toBeGreaterThan(0);
    expect(loadProducts().length).toBeGreaterThan(0);
    expect(loadGallery().photos.length).toBeGreaterThan(0);
  });
});
