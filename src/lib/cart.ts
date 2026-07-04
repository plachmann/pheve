import { z } from "zod";

export const MAX_DISTINCT_ITEMS = 10;
export const MAX_QUANTITY = 10;

export const cartItemSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  variant: z.string().min(1),
  quantity: z.number().int().min(1).max(MAX_QUANTITY),
});
export type CartItem = z.infer<typeof cartItemSchema>;
