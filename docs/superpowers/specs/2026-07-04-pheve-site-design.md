# PHEVE Band Website — Design

Date: 2026-07-04
Status: Approved pending final review

## Overview

A new website for PHEVE, a cover band, at pheve.com. It replaces the current
one-page link hub (logo + Facebook/Instagram/Venmo buttons). The site is
mostly static content — shows, gallery, booking — with one dynamic subsystem:
a self-fulfilled merch store with real inventory tracking.

## Decisions made during brainstorming

- **Merch model:** self-managed inventory. The band buys merch in bulk and
  ships orders themselves. Checkout via Stripe; the site tracks stock.
- **Fulfillment:** US-only shipping at a flat rate per order.
- **Content admin:** Phil only, editing files in the repo. No CMS, no admin UI.
- **Features:** merch store, upcoming shows, booking inquiry form,
  photo/video gallery, mailing list signup. Existing Facebook, Instagram, and
  Venmo links carry over.
- **Hosting:** Vercel.
- **Aesthetic:** keep the existing dark/black look and PHEVE logo.

## Architecture

Next.js (App Router) + Tailwind CSS on Vercel. Content pages are statically
rendered from typed JSON files in the repo. Dynamic behavior is confined to a
small set of route handlers plus one Postgres database.

| Concern | Choice |
|---|---|
| Framework | Next.js (App Router), TypeScript strict |
| Styling | Tailwind CSS |
| Payments | Stripe Checkout (hosted page) + Stripe Tax |
| Database | Neon Postgres (free tier), Drizzle ORM |
| Email (all of it) | Resend — transactional + Audiences/Broadcasts |
| Hosting | Vercel (preview deploys per PR, prod on merge) |

## Pages

| Route | Content | Rendering |
|---|---|---|
| `/` | Hero with logo, next upcoming show, social/Venmo links, mailing list signup | Static, ISR (hourly) |
| `/shows` | Upcoming events; past shows auto-hidden by date | Static, ISR (hourly) |

Date-dependent pages use ISR (hourly revalidation) so a show that has passed
disappears without waiting for the next deploy.
| `/store` | Product grid with sold-out badges | Dynamic read (stock) |
| `/store/[slug]` | Product detail: photos, variants, add to cart | Dynamic read (stock) |
| `/gallery` | Photo grid (repo images via `next/image`), embedded YouTube/Instagram videos | Static |
| `/booking` | Booking inquiry form | Static + API |

## Content model

Content lives in `content/` as JSON, validated with Zod at build time. A
validation failure fails the build, never the live site.

- `events.json` — date, venue, city, time, optional ticket/venue link.
- `products.json` — slug, name, price (cents), description, variants
  (e.g., sizes), image paths. Prices are passed to Stripe as `price_data`
  at checkout; there is no catalog to sync in the Stripe dashboard.
- `gallery.json` — image paths and video embed URLs.

Stock counts deliberately do NOT live in content files — they change when
nobody is at a keyboard, so they live in the database.

Publishing workflow: edit file → push → Vercel redeploys.

## Store flow

1. **Cart:** client-side, persisted in `localStorage`. Multi-product,
   adjustable quantities. No accounts.
2. **Checkout:** `POST /api/checkout` validates cart items against
   `products.json`, checks stock in Postgres, and creates a Stripe Checkout
   Session with line items, flat-rate US shipping, and Stripe Tax. Buyer pays
   on Stripe's hosted page; the site never handles card data.
3. **Webhook:** `POST /api/webhooks/stripe` on `checkout.session.completed` —
   verifies the signature, atomically decrements stock per variant, records
   the order, and emails the band an order notification via Resend. Stripe
   emails the buyer's receipt.
4. **Sold out:** a variant at stock 0 renders "Sold out" with buying disabled.
   Restocking is a script: `pnpm restock <slug> <variant> <qty>`.
5. **Fulfillment:** manual. The order email and Stripe dashboard provide the
   shipping address; the band buys labels wherever convenient.

### Database schema

- `inventory (product_slug, variant, stock)` — primary key (product_slug, variant)
- `orders (stripe_session_id primary key, line_items jsonb, status, created_at)`

### Oversell policy

Checkout re-checks stock before creating a session and the webhook decrements
atomically. A small race window exists while a buyer sits on Stripe's payment
page. Accepted for band-merch volumes; worst case is one apologetic refund.
No reservation holds.

## Forms and email

Single vendor: Resend, sending from pheve.com after DNS (SPF/DKIM) verification.

- **Booking:** `POST /api/booking` — Zod-validated fields (name, email, date,
  event type, message) → email to the band → on-page confirmation.
  Spam control: honeypot field + per-IP rate limit backed by the existing
  Postgres database (serverless functions can't keep in-memory counters).
  No CAPTCHA unless spam becomes a real problem.
- **Mailing list:** `POST /api/subscribe` adds the address to a Resend
  Audience. Announcements are sent as Resend Broadcasts from the Resend
  dashboard, which handles unsubscribe links (CAN-SPAM).
- **Order notifications:** sent from the Stripe webhook handler.

## Error handling

- Route handlers validate all input with Zod; structured 4xx responses with
  actionable messages surfaced in the UI (e.g., "That size just sold out —
  remove it from your cart").
- Webhook returns 5xx on processing failure so Stripe retries (up to 3 days).
  Handlers are idempotent, keyed on the Stripe session ID — a replayed event
  never double-decrements stock.
- Content JSON that fails Zod validation fails the build.
- Database unreachable → store renders with buying disabled and a friendly
  notice; all static pages are unaffected.

## Testing

- **Unit/integration (vitest, colocated `*.test.ts`):** cart math,
  stock-check logic, Zod content schemas rejecting malformed data, webhook
  idempotency (replayed session decrements once), checkout rejection of
  stale carts / unknown slugs / non-positive quantities. Stripe and Resend
  mocked at the boundary; database tested against a Neon branch or local
  Postgres.
- **E2E (Playwright):** browse → add to cart → Stripe Checkout (test mode)
  → pay with test card → stock decremented and order recorded. Booking form
  happy path. Stripe CLI (`stripe listen`) forwards webhooks in local dev.
- Static pages are covered by build-time content validation.

## Tooling and deployment

- Node 22 LTS, ESM, pnpm with exact pinned versions,
  `minimumReleaseAge 1440`, `ignore-scripts true`.
- TypeScript with full strict flags per global standards; oxlint + oxfmt;
  prek hooks (lint, format, typecheck) installed as the first commit.
- GitHub repo → Vercel. Secrets (`STRIPE_SECRET_KEY`,
  `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `DATABASE_URL`) in Vercel env
  vars; `.env.local` gitignored for dev. Stripe stays in test mode until
  launch.
- GitHub Actions: lint/typecheck/test on PRs, actions pinned to SHAs,
  workflows scanned with zizmor.

## Costs

Domain + Stripe fees (2.9% + 30¢ per transaction). Vercel, Neon, and Resend
free tiers are sufficient at band-site scale.

## Out of scope

- Song list / repertoire page (declined during brainstorming)
- CMS or admin UI of any kind
- International shipping and pickup-at-gig options
- Inventory reservation holds
- Print-on-demand integration
- User accounts, order history, or login of any kind
