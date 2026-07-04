import { readFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";

export const BAND_TIMEZONE = "America/New_York";

export const eventSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
  venue: z.string().min(1),
  city: z.string().min(1),
  time: z.string().min(1),
  link: z.url().optional(),
});
export type BandEvent = z.infer<typeof eventSchema>;

export const productSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/, "slug must be lowercase kebab-case"),
  name: z.string().min(1),
  priceCents: z.number().int().positive(),
  description: z.string().min(1),
  variants: z.array(z.string().min(1)).min(1),
  images: z.array(z.string().min(1)).min(1),
});
export type Product = z.infer<typeof productSchema>;

export const gallerySchema = z.object({
  photos: z.array(z.object({ src: z.string().min(1), alt: z.string().min(1) })),
  videos: z.array(z.object({ youtubeId: z.string().min(1), title: z.string().min(1) })),
});
export type Gallery = z.infer<typeof gallerySchema>;

function loadJson(name: string): unknown {
  const file = path.join(process.cwd(), "content", name);
  return JSON.parse(readFileSync(file, "utf8"));
}

export function loadEvents(): BandEvent[] {
  return z.array(eventSchema).parse(loadJson("events.json"));
}

export function loadProducts(): Product[] {
  return z.array(productSchema).parse(loadJson("products.json"));
}

export function loadGallery(): Gallery {
  return gallerySchema.parse(loadJson("gallery.json"));
}

export function getProduct(slug: string): Product | undefined {
  return loadProducts().find((p) => p.slug === slug);
}

export function upcomingEvents(events: BandEvent[], now: Date): BandEvent[] {
  // en-CA formats as YYYY-MM-DD, which makes string comparison correct.
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: BAND_TIMEZONE }).format(now);
  return events
    .filter((event) => event.date >= today)
    .toSorted((a, b) => a.date.localeCompare(b.date));
}
