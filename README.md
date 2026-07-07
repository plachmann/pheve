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
