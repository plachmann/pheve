CREATE TABLE "inventory" (
	"product_slug" text NOT NULL,
	"variant" text NOT NULL,
	"stock" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "inventory_product_slug_variant_pk" PRIMARY KEY("product_slug","variant")
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"stripe_session_id" text PRIMARY KEY NOT NULL,
	"line_items" jsonb NOT NULL,
	"status" text DEFAULT 'paid' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"window_start" timestamp with time zone NOT NULL
);
