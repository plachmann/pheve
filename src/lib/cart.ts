import { z } from "zod";
import type { Product } from "@/lib/content";

export const MAX_DISTINCT_ITEMS = 10;
export const MAX_QUANTITY = 10;

export const cartItemSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  variant: z.string().min(1),
  quantity: z.number().int().min(1).max(MAX_QUANTITY),
});
export type CartItem = z.infer<typeof cartItemSchema>;

export function addItem(cart: CartItem[], item: CartItem): CartItem[] {
  const existing = cart.find((line) => line.slug === item.slug && line.variant === item.variant);
  if (!existing) return [...cart, item];
  return cart.map((line) =>
    line === existing
      ? { ...line, quantity: Math.min(line.quantity + item.quantity, MAX_QUANTITY) }
      : line,
  );
}

export function removeItem(cart: CartItem[], slug: string, variant: string): CartItem[] {
  return cart.filter((line) => !(line.slug === slug && line.variant === variant));
}

export function setQuantity(
  cart: CartItem[],
  slug: string,
  variant: string,
  quantity: number,
): CartItem[] {
  if (quantity <= 0) return removeItem(cart, slug, variant);
  const capped = Math.min(quantity, MAX_QUANTITY);
  return cart.map((line) =>
    line.slug === slug && line.variant === variant ? { ...line, quantity: capped } : line,
  );
}

export function cartCount(cart: CartItem[]): number {
  return cart.reduce((sum, line) => sum + line.quantity, 0);
}

export function cartSubtotalCents(cart: CartItem[], products: Product[]): number {
  return cart.reduce((sum, line) => {
    const product = products.find((p) => p.slug === line.slug);
    if (!product) throw new Error(`Cart references unknown product: ${line.slug}`);
    return sum + product.priceCents * line.quantity;
  }, 0);
}

const compactItemSchema = z.object({
  s: z.string().min(1),
  v: z.string().min(1),
  q: z.number().int().min(1),
});

export function serializeCartMetadata(items: CartItem[]): string {
  const value = JSON.stringify(items.map((i) => ({ s: i.slug, v: i.variant, q: i.quantity })));
  if (value.length >= 500) {
    throw new Error(`Cart metadata too large for Stripe (${value.length} chars)`);
  }
  return value;
}

export function parseCartMetadata(value: string): CartItem[] {
  const compact = z.array(compactItemSchema).min(1).parse(JSON.parse(value));
  return compact.map((i) => ({ slug: i.s, variant: i.v, quantity: i.q }));
}
