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

3. **Enable Stripe Tax in live mode.** Separate from the test-mode setup above. The
   checkout session sets `automatic_tax: { enabled: true }` (`src/lib/checkout.ts`), so
   without an origin address and a US registration in live mode, session creation
   returns a 400 on real checkouts.

4. **Enable receipt emails.** The success page tells buyers "Stripe is emailing your
   receipt." Stripe only sends these when Settings → Emails → "Successful payments" is
   on (off by default, and test mode never delivers them).

5. **Activate the account for live payments.** Complete business details and a payout
   bank account, and confirm the enabled payment methods. Checkout branding
   (logo/colors) is optional.

## End-to-end tests

`pnpm e2e` runs locally only — it needs a real test-mode Stripe account and drives
the live Stripe Checkout page. CI runs unit tests and the build instead.

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
