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
