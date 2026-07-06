# Local Docker Postgres Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let `pnpm dev`, Drizzle migrations, seeding, and Playwright e2e tests run against a local Docker Postgres container instead of the remote Neon database, with zero manual env-switching.

**Architecture:** A `docker-compose.yml` runs `postgres:18-alpine` on host port 5433. A new `.env.development.local` file (gitignored) holds its `DATABASE_URL`; Next.js loads it automatically with higher precedence than `.env.local` for `next dev`, and `drizzle.config.ts` plus the `tsx`-run scripts (`restock`, new `seed`) are updated to layer it the same way. A new `scripts/seed.ts` populates the empty `inventory` table so the storefront and e2e purchase test have stock to work with.

**Tech Stack:** Docker Compose, `postgres:18-alpine`, Node.js 22 `--env-file-if-exists`, `dotenv` (already a devDependency), Drizzle ORM/Kit, `tsx`, Vitest.

## Global Constraints

- Postgres image: `postgres:18-alpine` (current stable major as of 2026-07).
- Host port: `5433` (container's `5432`), to avoid clashing with any locally installed Postgres.
- Local credentials: user `pheve`, password `pheve`, database `pheve_dev` — local-only, never used against a real database.
- Local `DATABASE_URL` has no `sslmode` param — the local container has no TLS.
- Default seed quantity: `25` units per product/variant.
- `docker compose up -d --wait` requires Compose v2.17+ (installed: v5.3.0 — satisfied).
- `--env-file-if-exists` requires Node 22.9+ (project targets Node 22 LTS — satisfied).
- `.env.development.local` must never be committed — it's already covered by the `.env*.local` line in `.gitignore`; verify this before moving on.

---

## Task 1: Docker Compose service & local env files

**Files:**
- Create: `docker-compose.yml`
- Create: `.env.development.local.example`
- Create (untracked, do not `git add`): `.env.development.local`
- Modify: `package.json` (add `docker:up`, `docker:down`, `docker:reset` scripts)

**Interfaces:**
- Produces: a `db` service reachable at `postgresql://pheve:pheve@localhost:5433/pheve_dev`, and npm scripts `docker:up` / `docker:down` / `docker:reset` that later tasks and the README depend on by name.

- [ ] **Step 1: Confirm `.env.development.local` will be gitignored**

Run: `git check-ignore -v .env.development.local`
Expected: prints a match against the `.env*.local` line in `.gitignore` (e.g. `.gitignore:8:.env*.local\t.env.development.local`). If it prints nothing, stop and fix `.gitignore` before continuing.

- [ ] **Step 2: Write `docker-compose.yml`**

```yaml
services:
  db:
    image: postgres:18-alpine
    environment:
      POSTGRES_USER: pheve
      POSTGRES_PASSWORD: pheve
      POSTGRES_DB: pheve_dev
    ports:
      - "5433:5432"
    volumes:
      - pheve_pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U pheve -d pheve_dev"]
      interval: 2s
      timeout: 5s
      retries: 15

volumes:
  pheve_pgdata:
```

- [ ] **Step 3: Write `.env.development.local.example`**

```
DATABASE_URL=postgresql://pheve:pheve@localhost:5433/pheve_dev
```

- [ ] **Step 4: Create your local `.env.development.local` with the same content**

```bash
cp .env.development.local.example .env.development.local
```

- [ ] **Step 5: Add Docker npm scripts to `package.json`**

In the `"scripts"` block, alongside the existing `"db:generate"` / `"db:migrate"` lines, add:

```json
    "docker:up": "docker compose up -d --wait",
    "docker:down": "docker compose down",
    "docker:reset": "docker compose down -v",
```

- [ ] **Step 6: Bring the container up and verify it's healthy**

Run: `pnpm docker:up`
Expected: command blocks briefly then exits 0, printing `Container pheve-db-1  Healthy` (name may vary based on your directory name).

- [ ] **Step 7: Verify connectivity**

Run: `docker compose exec -T db psql -U pheve -d pheve_dev -c 'select 1;'`
Expected output includes:
```
 ?column?
----------
        1
(1 row)
```

- [ ] **Step 8: Commit**

```bash
git add docker-compose.yml .env.development.local.example package.json
git commit -m "Add Docker Compose local Postgres service"
```

(Do not `git add .env.development.local` — it's gitignored and machine-local.)

---

## Task 2: Env-layered Drizzle migrations

**Files:**
- Modify: `drizzle.config.ts`

**Interfaces:**
- Consumes: Task 1's running container at `postgresql://pheve:pheve@localhost:5433/pheve_dev` via `.env.development.local`.
- Produces: `pnpm db:migrate` / `pnpm db:generate` target the local container whenever `.env.development.local` exists, falling back to `.env.local` otherwise. No new exports — this is config only.

- [ ] **Step 1: Update `drizzle.config.ts` to layer the local env file**

Current content:
```ts
import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local" });

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env["DATABASE_URL"] ?? "" },
});
```

Replace with:
```ts
import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local" });
config({ path: ".env.development.local", override: true });

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env["DATABASE_URL"] ?? "" },
});
```

`dotenv`'s `config()` silently no-ops (returns `{ error }`, doesn't throw) if the path doesn't exist, so this is safe even without `.env.development.local` present.

- [ ] **Step 2: Run migrations against the local container**

Run: `pnpm db:migrate`
Expected: exits 0, logs applying `0000_eager_typhoid_mary`.

- [ ] **Step 3: Verify the tables exist locally**

Run: `docker compose exec -T db psql -U pheve -d pheve_dev -c '\dt'`
Expected output lists `inventory`, `orders`, and `rate_limits`.

- [ ] **Step 4: Commit**

```bash
git add drizzle.config.ts
git commit -m "Layer .env.development.local into drizzle-kit config"
```

---

## Task 3: Seed script & npm wiring

**Files:**
- Create: `scripts/seed.ts`
- Create: `scripts/seed.test.ts`
- Modify: `package.json` (update `restock` script, add `db:seed` and `db:setup`)

**Interfaces:**
- Consumes: `loadProducts()` and `Product` type from `@/lib/content`; `setStock`, from `@/lib/inventory`; `getDb`, `closeDb` from `@/lib/db/client` (all existing, unchanged).
- Produces: exported `buildSeedRows(products: Product[], stock?: number): { slug: string; variant: string; stock: number }[]` (default `stock` is `25`), consumed only by `scripts/seed.test.ts` in this plan. npm scripts `db:seed`, `db:setup`.

- [ ] **Step 1: Write the failing test for `buildSeedRows`**

Create `scripts/seed.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import type { Product } from "@/lib/content";
import { buildSeedRows } from "./seed";

const products: Product[] = [
  {
    slug: "logo-tee",
    name: "PHEVE Logo Tee",
    priceCents: 2500,
    description: "x",
    variants: ["S", "L"],
    images: ["/images/pheve-logo.png"],
  },
  {
    slug: "sticker-pack",
    name: "Sticker Pack",
    priceCents: 500,
    description: "x",
    variants: ["One size"],
    images: ["/images/pheve-logo.png"],
  },
];

describe("buildSeedRows", () => {
  it("creates one row per product/variant pair with the default quantity", () => {
    expect(buildSeedRows(products)).toEqual([
      { slug: "logo-tee", variant: "S", stock: 25 },
      { slug: "logo-tee", variant: "L", stock: 25 },
      { slug: "sticker-pack", variant: "One size", stock: 25 },
    ]);
  });

  it("accepts a custom quantity", () => {
    expect(buildSeedRows(products, 5)).toEqual([
      { slug: "logo-tee", variant: "S", stock: 5 },
      { slug: "logo-tee", variant: "L", stock: 5 },
      { slug: "sticker-pack", variant: "One size", stock: 5 },
    ]);
  });

  it("returns an empty array for an empty catalog", () => {
    expect(buildSeedRows([])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run scripts/seed.test.ts`
Expected: FAIL — `scripts/seed.ts` does not exist yet (`Failed to resolve import`).

- [ ] **Step 3: Write `scripts/seed.ts`**

```ts
import { loadProducts, type Product } from "@/lib/content";
import { closeDb, getDb } from "@/lib/db/client";
import { setStock } from "@/lib/inventory";

const DEFAULT_SEED_STOCK = 25;

export function buildSeedRows(
  products: Product[],
  stock = DEFAULT_SEED_STOCK,
): { slug: string; variant: string; stock: number }[] {
  return products.flatMap((product) =>
    product.variants.map((variant) => ({ slug: product.slug, variant, stock })),
  );
}

async function main(): Promise<void> {
  const rows = buildSeedRows(loadProducts());
  const db = getDb();
  for (const row of rows) {
    await setStock(db, row.slug, row.variant, row.stock);
  }
  console.log(`Seeded stock for ${rows.length} product/variant pairs.`);
  await closeDb();
}

// Only run as a CLI, not when imported by tests.
if (process.argv[1]?.endsWith("seed.ts")) {
  main().catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run scripts/seed.test.ts`
Expected: PASS, 3 tests passed.

- [ ] **Step 5: Update the `restock` script and add `db:seed` / `db:setup` in `package.json`**

Change:
```json
    "restock": "tsx --env-file=.env.local scripts/restock.ts"
```
to:
```json
    "restock": "tsx --env-file=.env.local --env-file-if-exists=.env.development.local scripts/restock.ts",
    "db:seed": "tsx --env-file=.env.local --env-file-if-exists=.env.development.local scripts/seed.ts",
    "db:setup": "pnpm docker:up && pnpm db:migrate && pnpm db:seed"
```

- [ ] **Step 6: Run the seed script against the local container**

Run: `pnpm db:seed`
Expected: prints `Seeded stock for 7 product/variant pairs.` (`content/products.json` has `logo-tee` with 5 variants + `trucker-hat` with 1 + `sticker-pack` with 1 = 7).

- [ ] **Step 7: Verify stock rows in the local db**

Run: `docker compose exec -T db psql -U pheve -d pheve_dev -c 'select product_slug, variant, stock from inventory order by product_slug, variant;'`
Expected: 7 rows, each with `stock = 25`.

- [ ] **Step 8: Re-run the seed script to confirm it's idempotent**

Run: `pnpm db:seed`
Expected: same success output, no errors, row count in the db unchanged (still 7).

- [ ] **Step 9: Run the full test suite**

Run: `pnpm test`
Expected: all tests pass, including the new `scripts/seed.test.ts`.

- [ ] **Step 10: Commit**

```bash
git add scripts/seed.ts scripts/seed.test.ts package.json
git commit -m "Add inventory seed script for local dev"
```

---

## Task 4: README and end-to-end bootstrap verification

**Files:**
- Create: `README.md`

**Interfaces:**
- Consumes: `docker:up`, `db:migrate`, `db:seed`, `db:setup`, `docker:down`, `docker:reset` npm scripts from Tasks 1–3 (documents them; no code dependency).

- [ ] **Step 1: Write `README.md`**

```markdown
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
```

- [ ] **Step 2: Full bootstrap dry run from a clean slate**

Run:
```bash
pnpm docker:reset
pnpm db:setup
```
Expected: container recreated, migrations applied, seed prints `Seeded stock for 7 product/variant pairs.`

- [ ] **Step 3: Verify `pnpm dev` uses the local database**

Run: `pnpm dev` (in the background or a separate terminal), then in another shell:
```bash
curl -s http://localhost:3000/store/logo-tee | grep -o 'In stock' | head -1
```
Expected: `In stock` (or equivalent non-sold-out UI text) appears, confirming the page read stock from the freshly seeded local db rather than erroring or showing sold-out. Stop the dev server after checking.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "Document local Docker Postgres dev setup"
```
