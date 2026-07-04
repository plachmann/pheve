import { integer, jsonb, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";
import type { CartItem } from "@/lib/cart";

export const inventory = pgTable(
  "inventory",
  {
    productSlug: text("product_slug").notNull(),
    variant: text("variant").notNull(),
    stock: integer("stock").notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.productSlug, table.variant] })],
);

export const orders = pgTable("orders", {
  stripeSessionId: text("stripe_session_id").primaryKey(),
  lineItems: jsonb("line_items").$type<CartItem[]>().notNull(),
  status: text("status").notNull().default("paid"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
});
