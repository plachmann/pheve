# Local Docker Postgres — Design

Date: 2026-07-06
Status: Approved

## Overview

Today, local development (`pnpm dev`), Drizzle migrations (`pnpm db:generate`/
`db:migrate`), the `restock` CLI, and Playwright e2e tests all connect via
`DATABASE_URL` in `.env.local` — which holds live Neon credentials synced by
`vercel env pull`. There is no isolated local database: every local run reads
and writes the same remote dev/preview data.

This adds a local Postgres container (via Docker Compose) that `pnpm dev`,
migrations, seeding, and e2e tests use automatically, while leaving
`.env.local` and the remote Neon database untouched for cases where someone
deliberately wants to target it (e.g., production-facing `restock` runs).

## Architecture

| Concern | Choice |
|---|---|
| Local DB | `postgres:18-alpine` via Docker Compose, no custom Dockerfile |
| Host port | `5433` (avoids clashing with a locally installed Postgres on 5432) |
| Persistence | Named volume `pheve_pgdata`, survives `docker compose down` |
| Readiness | `pg_isready` healthcheck; `docker compose up -d --wait` blocks until healthy |
| Env switching | `.env.development.local` (new, gitignored) overrides `DATABASE_URL` for local tooling; absent by default fallback is `.env.local` (remote Neon) |

### `docker-compose.yml` (new, repo root)

One `db` service: `postgres:18-alpine`, env `POSTGRES_USER=pheve`,
`POSTGRES_PASSWORD=pheve`, `POSTGRES_DB=pheve_dev`, port mapping `5433:5432`,
named volume mounted at `/var/lib/postgresql/data`, healthcheck via
`pg_isready -U pheve`.

### Env file layering

- **`.env.local`** (existing, Vercel/Neon-managed): unchanged, stays the
  fallback for anything that doesn't see a local override.
- **`.env.development.local`** (new, gitignored — matches the existing
  `.env*.local` pattern already in `.gitignore`): contains
  `DATABASE_URL=postgresql://pheve:pheve@localhost:5433/pheve_dev` (no
  `sslmode` — the local container has no TLS).
- **`.env.development.local.example`** (new): checked-in template mirroring
  the line above, so the file's existence and format are discoverable.

Next.js natively loads `.env.development.local` for `next dev` with higher
precedence than `.env.local`, so `pnpm dev` and Playwright's `webServer`
(which runs `pnpm dev`) pick up the local container automatically — no code
changes needed for those two paths.

Two places load env manually and need the same precedence added explicitly:

- **`drizzle.config.ts`**: currently calls `config({ path: ".env.local" })`
  once. Add a second `config({ path: ".env.development.local", override: true })`
  call so `db:generate`/`db:migrate` prefer the local container when the file
  exists.
- **`scripts/restock.ts`** and the new **`scripts/seed.ts`**: currently
  invoked as `tsx --env-file=.env.local <script>`. Change to
  `tsx --env-file=.env.local --env-file-if-exists=.env.development.local <script>`
  (Node's `--env-file-if-exists`, stable since Node 22.9, does not error if
  the file is missing; later `--env-file` values override earlier ones for
  the same key).

## Seeding

The `inventory` table starts empty after a fresh migration — every
`getStockMap`/`checkStock` call defaults missing rows to 0 stock, which would
make the storefront's "add to cart" and the Playwright purchase e2e test fail
against a brand-new local db.

**`scripts/seed.ts`** (new): loads the product catalog via `loadProducts()`
and calls the existing `setStock()` helper for every product × variant with a
default quantity of **25**. Reuses `setStock`'s `onConflictDoUpdate` upsert,
so re-running the seed script is idempotent and safe.

## Workflow scripts

New `package.json` scripts:

| Script | Command | Purpose |
|---|---|---|
| `docker:up` | `docker compose up -d --wait` | Start the container, block until healthy |
| `docker:down` | `docker compose down` | Stop the container, keep data |
| `docker:reset` | `docker compose down -v` | Stop and wipe the volume for a clean slate |
| `db:seed` | `tsx --env-file=.env.local --env-file-if-exists=.env.development.local scripts/seed.ts` | Seed inventory |
| `db:setup` | `pnpm docker:up && pnpm db:migrate && pnpm db:seed` | One-shot first-time bootstrap |

## CI impact

None. CI's `pnpm test` uses the existing PGlite in-memory driver
(`src/lib/db/test-helpers.ts`) and never touches Docker or a real Postgres
socket. `pnpm build`/`pnpm start` aren't affected since Next.js only loads
`.env.development.local` for `next dev`.

## Documentation

Add a top-level `README.md` with a "Local development" section covering:
`pnpm db:setup` to bootstrap, `pnpm dev` to run, `pnpm docker:down` /
`pnpm docker:reset` to stop/wipe the local db.

## Testing

- `pnpm docker:up` brings up a healthy container.
- `pnpm db:migrate` applies the existing migration against it.
- `pnpm db:seed` populates stock; re-running is a no-op change (idempotent).
- `pnpm dev` connects to the local db (verify via a manual store page load).
- `pnpm e2e` (with Stripe/Resend test env vars present, per existing
  `test.skip` gates) runs the purchase flow against the local, seeded db.
