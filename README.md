# PHEVE

Band website and merch store (Next.js App Router, Drizzle/Postgres, Stripe, Resend).

## Local development

This project needs a Postgres database. For day-to-day local dev, run one
against Docker instead of the shared remote Neon database:

1. Copy the local env template (one-time): `cp .env.development.local.example .env.development.local`
2. Bootstrap the local database: `pnpm db:setup` — starts the Docker container, applies migrations, and seeds product stock.
3. Start the app: `pnpm dev`

`pnpm dev`, `pnpm db:generate`/`db:migrate`, `pnpm db:seed`, `pnpm restock`, and
`pnpm e2e` all target the local container automatically as long as
`.env.development.local` exists. Remove that file (or don't create it) to fall
back to whatever `DATABASE_URL` is in `.env.local`.

Other Docker commands:

- `pnpm docker:down` — stop the container, keep its data
- `pnpm docker:reset` — stop the container and wipe its data

## Production setup (Vercel)

The code is deploy-ready; everything below is account/dashboard/env configuration
that has no local equivalent.

1. **Environment variables.** Set the same keys as `.env.example` in the Vercel
   project (Production scope), using live values: `STRIPE_SECRET_KEY=sk_live_…`,
   `DATABASE_URL`, `RESEND_API_KEY`, `RESEND_AUDIENCE_ID`, `BAND_EMAIL`,
   `EMAIL_FROM`, and `STRIPE_WEBHOOK_SECRET` (from step 2).

2. **Register a webhook endpoint.** The local `stripe listen` bridge does not exist
   in production. In the Stripe Dashboard → Developers → Webhooks, add an endpoint at
   `https://<your-domain>/api/webhooks/stripe` and subscribe to
   `checkout.session.completed` — the only event `src/app/api/webhooks/stripe/route.ts`
   handles. Copy its signing secret (`whsec_…`) into `STRIPE_WEBHOOK_SECRET`.
   Without this, paid orders are **never recorded and stock never decrements**; the
   webhook is the only writer of orders and inventory.

   Use the host that serves the site directly. `pheve.com` returns a 308 to
   `www.pheve.com`, and Stripe does not follow redirects when delivering webhooks, so
   an apex endpoint fails on every event with nothing in the app's logs to show it.

3. **Enable Stripe Tax in live mode.** Separate from the test-mode setup above. The
   checkout session sets `automatic_tax: { enabled: true }` (`src/lib/checkout.ts`), so
   session creation returns a 400 on real checkouts until the tax settings carry an
   origin address.

   Registrations fail differently, and quietly. With settings active but no
   registration active for the buyer's jurisdiction, session creation **succeeds** and
   Stripe calculates $0 tax — no error anywhere, and the e2e suite asserts a $0 tax
   line, so neither surfaces it. Check registrations separately:

   ```
   stripe tax settings retrieve --live
   stripe tax registrations list --live
   ```

   A registration whose `active_from` is in the future reports `status: scheduled` and
   collects nothing until that date.

4. **Enable receipt emails.** The success page tells buyers "Stripe is emailing your
   receipt." Stripe only sends these when Settings → Emails → "Successful payments" is
   on (off by default, and test mode never delivers them).

5. **Activate the account for live payments.** Complete business details and a payout
   bank account, and confirm the enabled payment methods. Checkout branding
   (logo/colors) is optional.

## Preview deployments

Preview deployments can exercise checkout up to Stripe's hosted page, but not the
webhook. Add a **test-mode** `STRIPE_SECRET_KEY` (`sk_test_…`) to the Vercel Preview
scope and previews will validate products and variants, check stock, calculate tax and
shipping, create a session, and redirect to Stripe.

They cannot receive webhooks. Preview deployments sit behind Vercel's deployment
protection, so an unauthenticated `POST` to `/api/webhooks/stripe` gets a 302 to
`vercel.com/sso-api` rather than reaching the handler. A browser carries the SSO
cookie, which is why the checkout redirect itself still works. Consequence: no order is
recorded, no stock decrements, and no emails send on a preview purchase.

The webhook half is covered by `pnpm e2e` instead, which forwards real signed events
through `stripe listen` — see below. Don't point a Stripe webhook at a preview URL;
the endpoint also changes per branch.

## Restocking production

`pnpm restock <slug> <variant> <qty>` sets an absolute stock count. It targets the
local Docker database while `.env.development.local` exists, so reaching production
means moving that file aside:

```
mv .env.development.local .env.development.local.off
pnpm restock sticker-pack "One size" 50
mv .env.development.local.off .env.development.local
```

Refunds do not restock. The webhook only handles `checkout.session.completed`, so a
refunded order leaves inventory decremented and needs a manual restock.

## End-to-end tests

`pnpm e2e` runs locally only — it needs a real test-mode Stripe account and drives
the live Stripe Checkout page. CI runs unit tests and the build instead.

`playwright.config.ts` sets `reuseExistingServer`, so if another project is already
serving the target port the suite tests **that** app and assertions pass or fail for
unrelated reasons. Override the port when 3000 is occupied:

```
E2E_PORT=3100 pnpm e2e
```

`e2e/purchase.spec.ts` has two halves:

- **Session creation** drives the browser to Stripe's hosted checkout and asserts the
  line item, flat-rate shipping, and tax line render ($25 + $8 + $0 = $33). It stops at
  the hosted page — Stripe's iframed Payment Element is intentionally not automated.
- **Webhook → inventory** fires a real signed `checkout.session.completed` via
  `stripe trigger` and asserts the order is recorded and `logo-tee/L` stock decrements.

Prerequisites (once per machine):

1. Add a test-mode key to `.env.local`: `STRIPE_SECRET_KEY=sk_test_…`.
2. Enable Stripe Tax in the test dashboard (origin address + a US registration), or the
   `automatic_tax` checkout session returns a 400. Configurable via the Tax Settings API.
3. In a separate terminal, forward webhooks and copy the printed `whsec_…` into
   `STRIPE_WEBHOOK_SECRET` in `.env.local` (must be running during the test):

   ```
   stripe listen --api-key sk_test_… --forward-to localhost:3000/api/webhooks/stripe
   ```

4. Seed local stock (`pnpm db:setup`), then run `pnpm e2e`.
