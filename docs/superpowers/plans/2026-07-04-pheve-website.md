# PHEVE Band Website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build pheve.com — a cover-band site with shows, gallery, booking form, mailing list, and a self-fulfilled merch store with Stripe Checkout and webhook-driven inventory.

**Architecture:** Next.js App Router on Vercel. Content pages render statically from Zod-validated JSON in `content/`. The store is the only dynamic subsystem: a localStorage cart, a checkout route that creates Stripe Checkout Sessions, and an idempotent Stripe webhook that decrements stock in Neon Postgres and emails order notifications via Resend.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, TypeScript (strict), Zod 4, Stripe SDK 22, Drizzle ORM + `pg` (Neon Postgres), PGlite (tests), Resend 6, vitest 4, Playwright, oxlint/oxfmt, pnpm.

**Spec:** `docs/superpowers/specs/2026-07-04-pheve-site-design.md`

## Global Constraints

- Node 22 LTS, ESM only (`"type": "module"`). Package manager: pnpm 11.9.0.
- All dependency versions pinned exactly (no `^`/`~`). Versions below were looked up 2026-07-04 — do not substitute others without checking.
- tsconfig strictness: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noPropertyAccessFromIndexSignature`, `verbatimModuleSyntax`, `isolatedModules` — all enabled.
- Lint/format: oxlint + oxfmt. Zero warnings policy — fix everything before committing.
- Tests: vitest, colocated `*.test.ts`. E2E: Playwright in `e2e/`.
- Imports: absolute via `@/` alias. ≤100 lines/function, 100-char lines.
- Shipping: US only, flat rate `FLAT_SHIPPING_CENTS = 800` ($8.00) per order.
- Cart limits: `MAX_DISTINCT_ITEMS = 10` distinct slug+variant lines, `MAX_QUANTITY = 10` per line (keeps Stripe metadata under its 500-char value limit).
- Band timezone for "is this show over" logic: `America/New_York`.
- Dark aesthetic: black background (`bg-black`), zinc text, existing PHEVE logo.
- Env vars (never committed): `DATABASE_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `RESEND_AUDIENCE_ID`, `BAND_EMAIL`, `EMAIL_FROM`.
- All external clients (Stripe, Resend, pg Pool) are lazy singletons so `next build` needs no secrets.
- Out of scope (do NOT build): CMS/admin UI, user accounts, international shipping, pickup options, inventory reservation holds, print-on-demand, song list page.
- Commits: imperative mood, ≤72-char subject, one logical change each. Never push to main directly.

## File Structure

```
pheve/
├── content/                        # Editable content — Phil's "CMS"
│   ├── events.json                 # Shows
│   ├── products.json               # Merch catalog (prices here, stock in DB)
│   └── gallery.json                # Photos + YouTube video ids
├── public/images/                  # Logo, product & gallery photos
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Shell: nav, footer, CartProvider
│   │   ├── globals.css             # Tailwind entry
│   │   ├── page.tsx                # Home (hero, next show, socials, mailing list)
│   │   ├── shows/page.tsx          # Upcoming shows (ISR hourly)
│   │   ├── store/page.tsx          # Product grid (dynamic — reads stock)
│   │   ├── store/[slug]/page.tsx   # Product detail + AddToCart
│   │   ├── store/success/page.tsx  # Post-checkout: thanks + clear cart
│   │   ├── cart/page.tsx           # Cart review + checkout button
│   │   ├── gallery/page.tsx        # Photos + videos
│   │   ├── booking/page.tsx        # Booking inquiry form
│   │   └── api/
│   │       ├── checkout/route.ts        # Create Stripe Checkout Session
│   │       ├── webhooks/stripe/route.ts # Verify sig, record order, decrement stock
│   │       ├── booking/route.ts         # Validate + rate-limit + email inquiry
│   │       └── subscribe/route.ts       # Add email to Resend audience
│   ├── components/
│   │   ├── cart-provider.tsx       # Cart context + localStorage persistence
│   │   ├── cart-link.tsx           # Nav cart badge
│   │   ├── cart-view.tsx           # Cart page UI + checkout call
│   │   ├── add-to-cart.tsx         # Variant picker + add button
│   │   ├── booking-form.tsx        # Client form for /booking
│   │   └── mailing-list-form.tsx   # Email capture on home page
│   └── lib/
│       ├── content.ts              # Zod schemas + loaders + upcomingEvents
│       ├── cart.ts                 # Pure cart math + metadata (de)serialization
│       ├── money.ts                # formatCents
│       ├── booking.ts              # bookingSchema + BookingInquiry type
│       ├── checkout.ts             # createCheckoutSession (Stripe session build)
│       ├── webhook.ts              # processCheckoutCompleted
│       ├── stripe.ts               # Lazy Stripe client
│       ├── email.ts                # Resend wrappers (booking, order, subscribe)
│       ├── rate-limit.ts           # Postgres-backed fixed-window limiter
│       ├── inventory.ts            # Stock reads, upsert, atomic order+decrement
│       └── db/
│           ├── schema.ts           # inventory, orders, rate_limits tables
│           ├── client.ts           # pg Pool + Db type + getDb/closeDb
│           └── test-helpers.ts     # PGlite in-memory Db for tests
├── scripts/restock.ts              # pnpm restock <slug> <variant> <qty>
├── drizzle/                        # Generated SQL migrations (committed)
├── drizzle.config.ts
├── e2e/                            # Playwright: purchase.spec.ts, booking.spec.ts
├── playwright.config.ts
├── vitest.config.ts
├── .github/workflows/ci.yml
├── .pre-commit-config.yaml         # prek hooks
├── .oxlintrc.json
├── .npmrc / pnpm-workspace.yaml
└── package.json / tsconfig.json / next.config.ts / postcss.config.mjs
```

---

### Task 1: Scaffold Next.js app with guardrails

Manual scaffold (not create-next-app) so every config matches our standards exactly. Deliverable: hello-world page where `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test`, `pnpm build` all pass, prek hooks installed, CI workflow in place.

**Files:**
- Create: `package.json`, `.npmrc`, `pnpm-workspace.yaml`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `.oxlintrc.json`, `vitest.config.ts`, `.pre-commit-config.yaml`, `.env.example`, `src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx`, `.github/workflows/ci.yml`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: nothing (first task)
- Produces: `@/` import alias to `src/`; scripts `dev`, `build`, `lint`, `format`, `format:check`, `typecheck`, `test`, `db:generate`, `db:migrate`, `restock`, `e2e` used by every later task.

- [ ] **Step 1: Create package.json and pnpm settings**

`package.json`:

```json
{
  "name": "pheve",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@11.9.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "oxlint .",
    "format": "oxfmt .",
    "format:check": "oxfmt --check .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run --passWithNoTests",
    "test:watch": "vitest",
    "e2e": "playwright test",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "restock": "tsx --env-file=.env.local scripts/restock.ts"
  }
}
```

`.npmrc`:

```ini
save-exact=true
```

`pnpm-workspace.yaml` (pnpm 10+ reads settings here; 1440 min = 24 h supply-chain delay):

```yaml
minimumReleaseAge: 1440
```

- [ ] **Step 2: Install pinned dependencies**

```bash
pnpm add next@16.2.10 react@19.2.7 react-dom@19.2.7 zod@4.4.3
pnpm add -D typescript@6.0.3 @types/node@26.1.0 @types/react@19.2.17 @types/react-dom@19.2.3 \
  tailwindcss@4.3.2 @tailwindcss/postcss@4.3.2 oxlint@1.72.0 oxfmt@0.57.0 vitest@4.1.9
```

Expected: lockfile written with exact versions. (Contingency: if `next build` later rejects TypeScript 6, pin `typescript@5.9.x` — check `npm view typescript versions` for the latest 5.9.)

- [ ] **Step 3: Write tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Write build and tool configs**

`next.config.ts`:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

export default nextConfig;
```

`postcss.config.mjs`:

```js
export default { plugins: { "@tailwindcss/postcss": {} } };
```

`.oxlintrc.json`:

```json
{
  "plugins": ["typescript", "import", "unicorn", "react", "nextjs"],
  "categories": { "correctness": "error", "suspicious": "error" },
  "ignorePatterns": [".next", "node_modules", "drizzle"]
}
```

`vitest.config.ts`:

```ts
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "scripts/**/*.test.ts"],
  },
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "src") },
  },
});
```

`.pre-commit-config.yaml` (prek):

```yaml
repos:
  - repo: local
    hooks:
      - id: oxlint
        name: oxlint
        entry: pnpm exec oxlint
        language: system
        pass_filenames: false
      - id: oxfmt
        name: oxfmt --check
        entry: pnpm exec oxfmt --check .
        language: system
        pass_filenames: false
      - id: typecheck
        name: tsc --noEmit
        entry: pnpm exec tsc --noEmit
        language: system
        pass_filenames: false
```

`.env.example`:

```ini
DATABASE_URL=postgres://user:pass@xxx-pooler.us-east-2.aws.neon.tech/pheve?sslmode=require
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
RESEND_API_KEY=re_xxx
RESEND_AUDIENCE_ID=xxx
BAND_EMAIL=phil.lachmann@gmail.com
EMAIL_FROM="PHEVE <mail@pheve.com>"
```

Append to `.gitignore`:

```
.next/
next-env.d.ts
coverage/
playwright-report/
test-results/
.env*.local
```

- [ ] **Step 5: Write the app shell (placeholder, replaced in Task 3)**

`src/app/globals.css`:

```css
@import "tailwindcss";
```

`src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "PHEVE",
  description: "PHEVE — live cover band",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-black text-zinc-100 antialiased">{children}</body>
    </html>
  );
}
```

`src/app/page.tsx`:

```tsx
export default function HomePage() {
  return <main className="p-8 text-center text-2xl font-bold">PHEVE</main>;
}
```

- [ ] **Step 6: Write CI workflow**

`.github/workflows/ci.yml`:

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

jobs:
  checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0 # v7.0.0
        with:
          persist-credentials: false
      - uses: pnpm/action-setup@0ebf47130e4866e96fce0953f49152a61190b271 # v6.0.9
      - uses: actions/setup-node@48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e # v6.4.0
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm format:check
      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm build
```

- [ ] **Step 7: Run every gate**

```bash
pnpm lint && pnpm format:check && pnpm typecheck && pnpm test && pnpm build
prek install && prek run --all-files
zizmor .github/workflows/
```

Expected: all pass (vitest reports "no tests" but exits 0 via `--passWithNoTests`). Fix any warnings before committing — zero-warnings policy. If `oxfmt --check` rewrites expectations differ, run `pnpm format` once and re-check.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "Scaffold Next.js app with lint, test, and CI guardrails"
```

---

### Task 2: Content schemas, loaders, and seed content

**Files:**
- Create: `src/lib/content.ts`, `src/lib/content.test.ts`, `content/events.json`, `content/products.json`, `content/gallery.json`
- Create: `public/images/pheve-logo.png` (downloaded from the current live site)

**Interfaces:**
- Consumes: nothing
- Produces:
  - `eventSchema`, `productSchema`, `gallerySchema` (Zod schemas)
  - `type BandEvent = { date: string; venue: string; city: string; time: string; link?: string }`
  - `type Product = { slug: string; name: string; priceCents: number; description: string; variants: string[]; images: string[] }`
  - `type Gallery = { photos: { src: string; alt: string }[]; videos: { youtubeId: string; title: string }[] }`
  - `loadEvents(): BandEvent[]`, `loadProducts(): Product[]`, `loadGallery(): Gallery` — read + Zod-parse `content/*.json`, throwing on invalid data (this is the "build fails on bad content" mechanism, since static pages call these at build time)
  - `getProduct(slug: string): Product | undefined`
  - `upcomingEvents(events: BandEvent[], now: Date): BandEvent[]` — today-or-later in `BAND_TIMEZONE`, sorted ascending
  - `BAND_TIMEZONE = "America/New_York"`

- [ ] **Step 1: Download the logo asset**

```bash
mkdir -p public/images
curl -fsSL -o public/images/pheve-logo.png https://pheve.com/PHEVE_BAND.png
```

Expected: PNG file exists (`file public/images/pheve-logo.png` reports PNG image data).

- [ ] **Step 2: Write failing tests**

`src/lib/content.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  eventSchema,
  loadEvents,
  loadGallery,
  loadProducts,
  productSchema,
  upcomingEvents,
  type BandEvent,
} from "@/lib/content";

const show = (date: string): BandEvent => ({
  date,
  venue: "Test Venue",
  city: "Cincinnati, OH",
  time: "8:00 PM",
});

describe("eventSchema", () => {
  it("rejects a malformed date", () => {
    expect(eventSchema.safeParse(show("July 18")).success).toBe(false);
  });

  it("rejects an empty venue", () => {
    expect(eventSchema.safeParse({ ...show("2026-07-18"), venue: "" }).success).toBe(false);
  });

  it("accepts a valid event with an optional link", () => {
    const result = eventSchema.safeParse({ ...show("2026-07-18"), link: "https://example.com" });
    expect(result.success).toBe(true);
  });
});

describe("productSchema", () => {
  const product = {
    slug: "logo-tee",
    name: "PHEVE Logo Tee",
    priceCents: 2500,
    description: "Black tee.",
    variants: ["S", "M"],
    images: ["/images/pheve-logo.png"],
  };

  it("rejects a non-positive price", () => {
    expect(productSchema.safeParse({ ...product, priceCents: 0 }).success).toBe(false);
  });

  it("rejects an uppercase slug", () => {
    expect(productSchema.safeParse({ ...product, slug: "Logo Tee" }).success).toBe(false);
  });

  it("rejects an empty variants list", () => {
    expect(productSchema.safeParse({ ...product, variants: [] }).success).toBe(false);
  });
});

describe("upcomingEvents", () => {
  // Noon UTC on 2026-07-10 is 2026-07-10 in America/New_York.
  const now = new Date("2026-07-10T12:00:00Z");

  it("keeps today, drops yesterday, sorts ascending", () => {
    const events = [show("2026-08-01"), show("2026-07-09"), show("2026-07-10")];
    expect(upcomingEvents(events, now).map((e) => e.date)).toEqual(["2026-07-10", "2026-08-01"]);
  });

  it("returns empty for no upcoming shows", () => {
    expect(upcomingEvents([show("2026-01-01")], now)).toEqual([]);
  });
});

describe("loaders", () => {
  it("load the seed content files", () => {
    expect(loadEvents().length).toBeGreaterThan(0);
    expect(loadProducts().length).toBeGreaterThan(0);
    expect(loadGallery().photos.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `pnpm exec vitest run src/lib/content.test.ts`
Expected: FAIL — cannot resolve `@/lib/content`.

- [ ] **Step 4: Write the implementation and seed content**

`src/lib/content.ts`:

```ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";

export const BAND_TIMEZONE = "America/New_York";

export const eventSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
  venue: z.string().min(1),
  city: z.string().min(1),
  time: z.string().min(1),
  link: z.url().optional(),
});
export type BandEvent = z.infer<typeof eventSchema>;

export const productSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/, "slug must be lowercase kebab-case"),
  name: z.string().min(1),
  priceCents: z.number().int().positive(),
  description: z.string().min(1),
  variants: z.array(z.string().min(1)).min(1),
  images: z.array(z.string().min(1)).min(1),
});
export type Product = z.infer<typeof productSchema>;

export const gallerySchema = z.object({
  photos: z.array(z.object({ src: z.string().min(1), alt: z.string().min(1) })),
  videos: z.array(z.object({ youtubeId: z.string().min(1), title: z.string().min(1) })),
});
export type Gallery = z.infer<typeof gallerySchema>;

function loadJson(name: string): unknown {
  const file = path.join(process.cwd(), "content", name);
  return JSON.parse(readFileSync(file, "utf8"));
}

export function loadEvents(): BandEvent[] {
  return z.array(eventSchema).parse(loadJson("events.json"));
}

export function loadProducts(): Product[] {
  return z.array(productSchema).parse(loadJson("products.json"));
}

export function loadGallery(): Gallery {
  return gallerySchema.parse(loadJson("gallery.json"));
}

export function getProduct(slug: string): Product | undefined {
  return loadProducts().find((p) => p.slug === slug);
}

export function upcomingEvents(events: BandEvent[], now: Date): BandEvent[] {
  // en-CA formats as YYYY-MM-DD, which makes string comparison correct.
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: BAND_TIMEZONE }).format(now);
  return events
    .filter((event) => event.date >= today)
    .toSorted((a, b) => a.date.localeCompare(b.date));
}
```

`content/events.json` (placeholder gigs — Phil replaces with real dates before launch):

```json
[
  { "date": "2026-07-18", "venue": "The Madison Live", "city": "Covington, KY", "time": "8:00 PM" },
  { "date": "2026-08-01", "venue": "Fretboard Brewing", "city": "Cincinnati, OH", "time": "7:30 PM" }
]
```

`content/products.json` (placeholder catalog — images reuse the logo until product photos exist):

```json
[
  {
    "slug": "logo-tee",
    "name": "PHEVE Logo Tee",
    "priceCents": 2500,
    "description": "Black tee, big logo. The uniform.",
    "variants": ["S", "M", "L", "XL", "2XL"],
    "images": ["/images/pheve-logo.png"]
  },
  {
    "slug": "trucker-hat",
    "name": "PHEVE Trucker Hat",
    "priceCents": 2000,
    "description": "Mesh-back trucker hat with the PHEVE logo.",
    "variants": ["One size"],
    "images": ["/images/pheve-logo.png"]
  },
  {
    "slug": "sticker-pack",
    "name": "Sticker Pack",
    "priceCents": 500,
    "description": "Five die-cut stickers. Laptop not included.",
    "variants": ["One size"],
    "images": ["/images/pheve-logo.png"]
  }
]
```

`content/gallery.json`:

```json
{
  "photos": [{ "src": "/images/pheve-logo.png", "alt": "PHEVE logo" }],
  "videos": []
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm exec vitest run src/lib/content.test.ts`
Expected: PASS (10 tests).

- [ ] **Step 6: Run gates and commit**

```bash
pnpm lint && pnpm format:check && pnpm typecheck && pnpm test
git add -A
git commit -m "Add content schemas, loaders, and seed content"
```

---

### Task 3: Site shell and home page

Static UI — no unit tests beyond the build succeeding; behavior is covered by e2e later.

**Files:**
- Modify: `src/app/layout.tsx` (real nav + footer), `src/app/page.tsx` (real home page)

**Interfaces:**
- Consumes: `loadEvents`, `upcomingEvents` from `@/lib/content` (Task 2)
- Produces: nav in `layout.tsx` with a `{/* cart-link */}` anchor comment where Task 6 inserts `<CartLink />`; social URLs used site-wide: `https://www.facebook.com/PHEVEband`, `https://www.instagram.com/pheveband/`, `https://venmo.com/pheve`

- [ ] **Step 1: Replace layout with nav and footer**

`src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "PHEVE — Live Cover Band",
  description: "PHEVE plays the songs you know. Shows, merch, and booking.",
};

const NAV_LINKS = [
  { href: "/shows", label: "Shows" },
  { href: "/store", label: "Store" },
  { href: "/gallery", label: "Gallery" },
  { href: "/booking", label: "Booking" },
];

const SOCIAL_LINKS = [
  { href: "https://www.facebook.com/PHEVEband", label: "Facebook" },
  { href: "https://www.instagram.com/pheveband/", label: "Instagram" },
  { href: "https://venmo.com/pheve", label: "Venmo Tips" },
];

function Nav() {
  return (
    <header className="border-b border-zinc-800">
      <nav className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-4">
        <Link href="/" className="text-xl font-black tracking-widest">
          PHEVE
        </Link>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-zinc-300">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-white">
              {link.label}
            </Link>
          ))}
          {/* cart-link */}
        </div>
      </nav>
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-16 border-t border-zinc-800 py-8 text-center text-sm text-zinc-500">
      <div className="flex justify-center gap-6 pb-4">
        {SOCIAL_LINKS.map((link) => (
          <a key={link.href} href={link.href} className="hover:text-zinc-300">
            {link.label}
          </a>
        ))}
      </div>
      <p>© {new Date().getFullYear()} PHEVE</p>
    </footer>
  );
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-black text-zinc-100 antialiased">
        <Nav />
        {children}
        <Footer />
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Replace the home page**

`src/app/page.tsx`:

```tsx
import Image from "next/image";
import Link from "next/link";
import { loadEvents, upcomingEvents } from "@/lib/content";

export const revalidate = 3600;

export default function HomePage() {
  const nextShow = upcomingEvents(loadEvents(), new Date())[0];

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 text-center">
      <div className="relative mx-auto h-56 w-full max-w-md">
        <Image
          src="/images/pheve-logo.png"
          alt="PHEVE"
          fill
          priority
          className="object-contain"
          sizes="(max-width: 640px) 100vw, 448px"
        />
      </div>
      <p className="mt-6 text-lg text-zinc-400">The songs you know, played loud.</p>

      <section className="mt-12">
        {nextShow ? (
          <div className="mx-auto max-w-md rounded-lg border border-zinc-800 p-6">
            <h2 className="text-sm uppercase tracking-widest text-zinc-500">Next show</h2>
            <p className="mt-2 text-xl font-bold">{nextShow.venue}</p>
            <p className="text-zinc-400">
              {nextShow.city} · {nextShow.date} · {nextShow.time}
            </p>
            <Link href="/shows" className="mt-3 inline-block text-sm underline hover:text-white">
              All shows
            </Link>
          </div>
        ) : (
          <p className="text-zinc-500">
            No shows on the books — follow us and you’ll be the first to know.
          </p>
        )}
      </section>

      <section className="mt-12 flex flex-col items-center gap-3">
        <a
          href="https://www.facebook.com/PHEVEband"
          className="w-full max-w-xs rounded-lg bg-zinc-800 py-3 font-semibold hover:bg-zinc-700"
        >
          Follow us on Facebook
        </a>
        <a
          href="https://www.instagram.com/pheveband/"
          className="w-full max-w-xs rounded-lg bg-zinc-800 py-3 font-semibold hover:bg-zinc-700"
        >
          Follow us on Instagram
        </a>
        <a
          href="https://venmo.com/pheve"
          className="w-full max-w-xs rounded-lg bg-zinc-800 py-3 font-semibold hover:bg-zinc-700"
        >
          Venmo Tips
        </a>
      </section>

      {/* mailing-list */}
    </main>
  );
}
```

(The `{/* mailing-list */}` anchor comment is where Task 12 inserts `<MailingListForm />`.)

- [ ] **Step 3: Verify in the browser and run gates**

```bash
pnpm dev
```

Expected: home page renders logo, next show card (from seed events), social buttons, nav, footer. Then:

```bash
pnpm lint && pnpm format:check && pnpm typecheck && pnpm build
```

Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Add site shell and home page"
```

---

### Task 4: Shows page

**Files:**
- Create: `src/app/shows/page.tsx`

**Interfaces:**
- Consumes: `loadEvents`, `upcomingEvents`, `type BandEvent` from `@/lib/content`
- Produces: nothing used by later tasks

- [ ] **Step 1: Write the page**

`src/app/shows/page.tsx`:

```tsx
import type { Metadata } from "next";
import { loadEvents, upcomingEvents, type BandEvent } from "@/lib/content";

export const revalidate = 3600;

export const metadata: Metadata = { title: "Shows — PHEVE" };

function formatDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function EventCard({ event }: { event: BandEvent }) {
  return (
    <li className="rounded-lg border border-zinc-800 p-5">
      <p className="text-sm uppercase tracking-widest text-zinc-500">{formatDate(event.date)}</p>
      <p className="mt-1 text-xl font-bold">{event.venue}</p>
      <p className="text-zinc-400">
        {event.city} · {event.time}
      </p>
      {event.link ? (
        <a href={event.link} className="mt-2 inline-block text-sm underline hover:text-white">
          Venue info
        </a>
      ) : null}
    </li>
  );
}

export default function ShowsPage() {
  const events = upcomingEvents(loadEvents(), new Date());

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-black tracking-wide">Upcoming Shows</h1>
      {events.length === 0 ? (
        <p className="mt-8 text-zinc-500">
          Nothing on the calendar right now. Follow us on socials — new dates land there first.
        </p>
      ) : (
        <ul className="mt-8 space-y-4">
          {events.map((event) => (
            <EventCard key={`${event.date}-${event.venue}`} event={event} />
          ))}
        </ul>
      )}
    </main>
  );
}
```

- [ ] **Step 2: Verify and run gates**

`pnpm dev` → `/shows` lists the two seed shows, newest last. Then `pnpm lint && pnpm format:check && pnpm typecheck && pnpm build` — all pass.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "Add shows page with hourly revalidation"
```

---

### Task 5: Database layer and inventory module

**Files:**
- Create: `src/lib/db/schema.ts`, `src/lib/db/client.ts`, `src/lib/db/test-helpers.ts`, `src/lib/inventory.ts`, `src/lib/inventory.test.ts`, `drizzle.config.ts`, `drizzle/` (generated), and `src/lib/cart.ts` (types only — full cart logic in Task 6)

**Interfaces:**
- Consumes: nothing from earlier tasks
- Produces:
  - `type CartItem = { slug: string; variant: string; quantity: number }` (in `@/lib/cart`)
  - `type Db` and `getDb(): Db`, `closeDb(): Promise<void>` (in `@/lib/db/client`)
  - `createTestDb(): Promise<Db>` (in `@/lib/db/test-helpers`)
  - In `@/lib/inventory`:
    - `type StockIssue = { slug: string; variant: string; requested: number; available: number }`
    - `getAllStock(db: Db): Promise<Record<string, Record<string, number>>>` — slug → variant → stock
    - `getStockMap(db: Db, slug: string): Promise<Record<string, number>>` — variant → stock
    - `setStock(db: Db, slug: string, variant: string, stock: number): Promise<void>` — upsert
    - `checkStock(db: Db, items: CartItem[]): Promise<StockIssue[]>` — empty array means all in stock; a missing inventory row counts as 0 available
    - `recordOrderAndDecrement(db: Db, sessionId: string, items: CartItem[]): Promise<"recorded" | "duplicate">` — transactional and idempotent on sessionId; stock floors at 0

- [ ] **Step 1: Install dependencies**

```bash
pnpm add drizzle-orm@0.45.2 pg@8.22.0
pnpm add -D drizzle-kit@0.31.10 @types/pg@8.20.0 @electric-sql/pglite@0.5.4 dotenv@17.4.2 tsx@4.23.0
```

(`dotenv` is dev-only, used by `drizzle.config.ts` so `db:migrate` can read `.env.local`.)

- [ ] **Step 2: Write cart types, schema, and drizzle config**

`src/lib/cart.ts` (Task 6 extends this file with cart math):

```ts
import { z } from "zod";

export const MAX_DISTINCT_ITEMS = 10;
export const MAX_QUANTITY = 10;

export const cartItemSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  variant: z.string().min(1),
  quantity: z.number().int().min(1).max(MAX_QUANTITY),
});
export type CartItem = z.infer<typeof cartItemSchema>;
```

`src/lib/db/schema.ts`:

```ts
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
```

`drizzle.config.ts`:

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

- [ ] **Step 3: Generate the migration**

```bash
pnpm db:generate
```

Expected: `drizzle/0000_*.sql` created containing `CREATE TABLE` for `inventory`, `orders`, `rate_limits`. Commit this folder — tests and deploys both consume it.

- [ ] **Step 4: Write client and test helper**

`src/lib/db/client.ts`:

```ts
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/lib/db/schema";

export type Db = NodePgDatabase<typeof schema>;

let pool: Pool | null = null;
let db: Db | null = null;

export function getDb(): Db {
  if (db) return db;
  const url = process.env["DATABASE_URL"];
  if (!url) {
    throw new Error("DATABASE_URL is not set — add the Neon pooled connection string to .env.local");
  }
  pool = new Pool({ connectionString: url, max: 1 });
  db = drizzle(pool, { schema });
  return db;
}

export async function closeDb(): Promise<void> {
  await pool?.end();
  pool = null;
  db = null;
}
```

`src/lib/db/test-helpers.ts`:

```ts
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import type { Db } from "@/lib/db/client";
import * as schema from "@/lib/db/schema";

export async function createTestDb(): Promise<Db> {
  const pglite = new PGlite();
  const db = drizzle(pglite, { schema });
  await migrate(db, { migrationsFolder: "drizzle" });
  // PgliteDatabase and NodePgDatabase share the PgDatabase base class and are
  // runtime-compatible for every query we issue; the cast bridges the driver generics.
  return db as unknown as Db;
}
```

- [ ] **Step 5: Write failing inventory tests**

`src/lib/inventory.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/lib/db/client";
import { createTestDb } from "@/lib/db/test-helpers";
import {
  checkStock,
  getAllStock,
  getStockMap,
  recordOrderAndDecrement,
  setStock,
} from "@/lib/inventory";

let db: Db;

beforeEach(async () => {
  db = await createTestDb();
  await setStock(db, "logo-tee", "L", 5);
  await setStock(db, "logo-tee", "M", 0);
});

describe("setStock / reads", () => {
  it("upserts and reads back", async () => {
    await setStock(db, "logo-tee", "L", 9);
    expect(await getStockMap(db, "logo-tee")).toEqual({ L: 9, M: 0 });
  });

  it("getAllStock groups by slug", async () => {
    await setStock(db, "sticker-pack", "One size", 50);
    const all = await getAllStock(db);
    expect(all["logo-tee"]).toEqual({ L: 5, M: 0 });
    expect(all["sticker-pack"]).toEqual({ "One size": 50 });
  });
});

describe("checkStock", () => {
  it("returns no issues when stock covers the cart", async () => {
    expect(await checkStock(db, [{ slug: "logo-tee", variant: "L", quantity: 5 }])).toEqual([]);
  });

  it("reports shortage with available count", async () => {
    const issues = await checkStock(db, [{ slug: "logo-tee", variant: "L", quantity: 6 }]);
    expect(issues).toEqual([{ slug: "logo-tee", variant: "L", requested: 6, available: 5 }]);
  });

  it("treats a missing inventory row as zero available", async () => {
    const issues = await checkStock(db, [{ slug: "ghost-item", variant: "L", quantity: 1 }]);
    expect(issues).toEqual([{ slug: "ghost-item", variant: "L", requested: 1, available: 0 }]);
  });
});

describe("recordOrderAndDecrement", () => {
  const items = [{ slug: "logo-tee", variant: "L", quantity: 2 }];

  it("records the order and decrements stock", async () => {
    expect(await recordOrderAndDecrement(db, "cs_1", items)).toBe("recorded");
    expect(await getStockMap(db, "logo-tee")).toEqual({ L: 3, M: 0 });
  });

  it("is idempotent: a replayed session id does not decrement twice", async () => {
    await recordOrderAndDecrement(db, "cs_1", items);
    expect(await recordOrderAndDecrement(db, "cs_1", items)).toBe("duplicate");
    expect(await getStockMap(db, "logo-tee")).toEqual({ L: 3, M: 0 });
  });

  it("floors stock at zero instead of going negative", async () => {
    await recordOrderAndDecrement(db, "cs_2", [{ slug: "logo-tee", variant: "L", quantity: 10 }]);
    expect(await getStockMap(db, "logo-tee")).toEqual({ L: 0, M: 0 });
  });
});
```

- [ ] **Step 6: Run tests to verify they fail**

Run: `pnpm exec vitest run src/lib/inventory.test.ts`
Expected: FAIL — cannot resolve `@/lib/inventory`.

- [ ] **Step 7: Implement the inventory module**

`src/lib/inventory.ts`:

```ts
import { and, eq, inArray, sql } from "drizzle-orm";
import type { CartItem } from "@/lib/cart";
import type { Db } from "@/lib/db/client";
import { inventory, orders } from "@/lib/db/schema";

export type StockIssue = { slug: string; variant: string; requested: number; available: number };

export async function getAllStock(db: Db): Promise<Record<string, Record<string, number>>> {
  const rows = await db.select().from(inventory);
  const result: Record<string, Record<string, number>> = {};
  for (const row of rows) {
    result[row.productSlug] ??= {};
    result[row.productSlug]![row.variant] = row.stock;
  }
  return result;
}

export async function getStockMap(db: Db, slug: string): Promise<Record<string, number>> {
  const rows = await db.select().from(inventory).where(eq(inventory.productSlug, slug));
  const result: Record<string, number> = {};
  for (const row of rows) {
    result[row.variant] = row.stock;
  }
  return result;
}

export async function setStock(db: Db, slug: string, variant: string, stock: number): Promise<void> {
  await db
    .insert(inventory)
    .values({ productSlug: slug, variant, stock })
    .onConflictDoUpdate({ target: [inventory.productSlug, inventory.variant], set: { stock } });
}

export async function checkStock(db: Db, items: CartItem[]): Promise<StockIssue[]> {
  const slugs = items.map((item) => item.slug);
  const rows = await db.select().from(inventory).where(inArray(inventory.productSlug, slugs));
  const available = new Map(rows.map((row) => [`${row.productSlug}|${row.variant}`, row.stock]));

  const issues: StockIssue[] = [];
  for (const item of items) {
    const inStock = available.get(`${item.slug}|${item.variant}`) ?? 0;
    if (item.quantity > inStock) {
      issues.push({
        slug: item.slug,
        variant: item.variant,
        requested: item.quantity,
        available: inStock,
      });
    }
  }
  return issues;
}

export async function recordOrderAndDecrement(
  db: Db,
  sessionId: string,
  items: CartItem[],
): Promise<"recorded" | "duplicate"> {
  return await db.transaction(async (tx) => {
    const inserted = await tx
      .insert(orders)
      .values({ stripeSessionId: sessionId, lineItems: items })
      .onConflictDoNothing()
      .returning({ id: orders.stripeSessionId });
    if (inserted.length === 0) return "duplicate";

    for (const item of items) {
      await tx
        .update(inventory)
        .set({ stock: sql`greatest(${inventory.stock} - ${item.quantity}, 0)` })
        .where(and(eq(inventory.productSlug, item.slug), eq(inventory.variant, item.variant)));
    }
    return "recorded";
  });
}
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `pnpm exec vitest run src/lib/inventory.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 9: Run gates and commit**

```bash
pnpm lint && pnpm format:check && pnpm typecheck && pnpm test
git add -A
git commit -m "Add database schema and inventory module with idempotent orders"
```

---

### Task 6: Cart logic, provider, and cart page

**Files:**
- Modify: `src/lib/cart.ts` (add cart math + metadata serialization), `src/app/layout.tsx` (wrap CartProvider, add CartLink at the `{/* cart-link */}` anchor)
- Create: `src/lib/cart.test.ts`, `src/lib/money.ts`, `src/lib/money.test.ts`, `src/components/cart-provider.tsx`, `src/components/cart-link.tsx`, `src/components/cart-view.tsx`, `src/app/cart/page.tsx`

**Interfaces:**
- Consumes: `cartItemSchema`, `type CartItem`, `MAX_QUANTITY` (Task 5); `type Product`, `loadProducts` (Task 2)
- Produces:
  - In `@/lib/cart`: `addItem(cart: CartItem[], item: CartItem): CartItem[]`, `removeItem(cart: CartItem[], slug: string, variant: string): CartItem[]`, `setQuantity(cart: CartItem[], slug: string, variant: string, quantity: number): CartItem[]`, `cartCount(cart: CartItem[]): number`, `cartSubtotalCents(cart: CartItem[], products: Product[]): number` (throws on unknown slug), `serializeCartMetadata(items: CartItem[]): string`, `parseCartMetadata(value: string): CartItem[]` (throws on malformed input)
  - In `@/lib/money`: `formatCents(cents: number): string` → `"$25.00"`
  - In `@/components/cart-provider`: `CartProvider`, `useCart(): { items: CartItem[]; add(item: CartItem): void; remove(slug: string, variant: string): void; setQty(slug: string, variant: string, quantity: number): void; clear(): void }`

- [ ] **Step 1: Write failing tests**

`src/lib/money.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { formatCents } from "@/lib/money";

describe("formatCents", () => {
  it("formats dollars and cents", () => {
    expect(formatCents(2500)).toBe("$25.00");
    expect(formatCents(999)).toBe("$9.99");
  });
});
```

`src/lib/cart.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  addItem,
  cartCount,
  cartSubtotalCents,
  MAX_QUANTITY,
  parseCartMetadata,
  removeItem,
  serializeCartMetadata,
  setQuantity,
  type CartItem,
} from "@/lib/cart";
import type { Product } from "@/lib/content";

const tee: CartItem = { slug: "logo-tee", variant: "L", quantity: 1 };

const products: Product[] = [
  {
    slug: "logo-tee",
    name: "PHEVE Logo Tee",
    priceCents: 2500,
    description: "x",
    variants: ["L"],
    images: ["/images/pheve-logo.png"],
  },
];

describe("addItem", () => {
  it("adds a new line", () => {
    expect(addItem([], tee)).toEqual([tee]);
  });

  it("merges quantities for the same slug+variant", () => {
    expect(addItem([tee], { ...tee, quantity: 2 })).toEqual([{ ...tee, quantity: 3 }]);
  });

  it("caps merged quantity at MAX_QUANTITY", () => {
    const cart = addItem([{ ...tee, quantity: MAX_QUANTITY }], tee);
    expect(cart).toEqual([{ ...tee, quantity: MAX_QUANTITY }]);
  });

  it("treats a different variant as a separate line", () => {
    expect(addItem([tee], { ...tee, variant: "M" })).toHaveLength(2);
  });
});

describe("removeItem / setQuantity", () => {
  it("removes a line", () => {
    expect(removeItem([tee], "logo-tee", "L")).toEqual([]);
  });

  it("sets quantity", () => {
    expect(setQuantity([tee], "logo-tee", "L", 4)).toEqual([{ ...tee, quantity: 4 }]);
  });

  it("removes the line when quantity drops to zero", () => {
    expect(setQuantity([tee], "logo-tee", "L", 0)).toEqual([]);
  });
});

describe("totals", () => {
  it("counts items across lines", () => {
    expect(cartCount([tee, { slug: "hat", variant: "One size", quantity: 2 }])).toBe(3);
  });

  it("computes the subtotal", () => {
    expect(cartSubtotalCents([{ ...tee, quantity: 3 }], products)).toBe(7500);
  });

  it("throws on an unknown slug", () => {
    expect(() => cartSubtotalCents([{ ...tee, slug: "ghost" }], products)).toThrow(/ghost/);
  });
});

describe("cart metadata round-trip", () => {
  it("serializes compactly and parses back", () => {
    const items = [tee, { slug: "sticker-pack", variant: "One size", quantity: 2 }];
    expect(parseCartMetadata(serializeCartMetadata(items))).toEqual(items);
  });

  it("stays under Stripe's 500-char metadata limit at max cart size", () => {
    const items = Array.from({ length: 10 }, (_, i) => ({
      slug: `item-${i}`,
      variant: "One size",
      quantity: 10,
    }));
    expect(serializeCartMetadata(items).length).toBeLessThan(500);
  });

  it("throws rather than silently truncating an oversized cart", () => {
    const items = Array.from({ length: 10 }, (_, i) => ({
      slug: `absurdly-long-product-slug-that-nobody-should-use-${i}`,
      variant: "One size",
      quantity: 10,
    }));
    expect(() => serializeCartMetadata(items)).toThrow(/metadata/i);
  });

  it("throws on malformed metadata", () => {
    expect(() => parseCartMetadata("not json")).toThrow();
    expect(() => parseCartMetadata('[{"s":"x"}]')).toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run src/lib/cart.test.ts src/lib/money.test.ts`
Expected: FAIL — exports don't exist yet.

- [ ] **Step 3: Implement cart math and money helper**

Add `import type { Product } from "@/lib/content";` to the imports at the top of
`src/lib/cart.ts`, then append below the existing schema/types from Task 5:

```ts
export function addItem(cart: CartItem[], item: CartItem): CartItem[] {
  const existing = cart.find((line) => line.slug === item.slug && line.variant === item.variant);
  if (!existing) return [...cart, item];
  return cart.map((line) =>
    line === existing
      ? { ...line, quantity: Math.min(line.quantity + item.quantity, MAX_QUANTITY) }
      : line,
  );
}

export function removeItem(cart: CartItem[], slug: string, variant: string): CartItem[] {
  return cart.filter((line) => !(line.slug === slug && line.variant === variant));
}

export function setQuantity(
  cart: CartItem[],
  slug: string,
  variant: string,
  quantity: number,
): CartItem[] {
  if (quantity <= 0) return removeItem(cart, slug, variant);
  const capped = Math.min(quantity, MAX_QUANTITY);
  return cart.map((line) =>
    line.slug === slug && line.variant === variant ? { ...line, quantity: capped } : line,
  );
}

export function cartCount(cart: CartItem[]): number {
  return cart.reduce((sum, line) => sum + line.quantity, 0);
}

export function cartSubtotalCents(cart: CartItem[], products: Product[]): number {
  return cart.reduce((sum, line) => {
    const product = products.find((p) => p.slug === line.slug);
    if (!product) throw new Error(`Cart references unknown product: ${line.slug}`);
    return sum + product.priceCents * line.quantity;
  }, 0);
}

const compactItemSchema = z.object({
  s: z.string().min(1),
  v: z.string().min(1),
  q: z.number().int().min(1),
});

export function serializeCartMetadata(items: CartItem[]): string {
  const value = JSON.stringify(items.map((i) => ({ s: i.slug, v: i.variant, q: i.quantity })));
  if (value.length >= 500) {
    throw new Error(`Cart metadata too large for Stripe (${value.length} chars)`);
  }
  return value;
}

export function parseCartMetadata(value: string): CartItem[] {
  const compact = z.array(compactItemSchema).min(1).parse(JSON.parse(value));
  return compact.map((i) => ({ slug: i.s, variant: i.v, quantity: i.q }));
}
```

`src/lib/money.ts`:

```ts
export function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run src/lib/cart.test.ts src/lib/money.test.ts`
Expected: PASS (14 tests).

- [ ] **Step 5: Write the cart provider and nav badge**

`src/components/cart-provider.tsx`:

```tsx
"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { z } from "zod";
import { addItem, cartItemSchema, removeItem, setQuantity, type CartItem } from "@/lib/cart";

type CartContextValue = {
  items: CartItem[];
  add: (item: CartItem) => void;
  remove: (slug: string, variant: string) => void;
  setQty: (slug: string, variant: string, quantity: number) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "pheve-cart";

function loadStoredCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = z.array(cartItemSchema).safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setItems(loadStoredCart());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, loaded]);

  const value: CartContextValue = {
    items,
    add: (item) => setItems((cart) => addItem(cart, item)),
    remove: (slug, variant) => setItems((cart) => removeItem(cart, slug, variant)),
    setQty: (slug, variant, quantity) => setItems((cart) => setQuantity(cart, slug, variant, quantity)),
    clear: () => setItems([]),
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
```

`src/components/cart-link.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useCart } from "@/components/cart-provider";
import { cartCount } from "@/lib/cart";

export function CartLink() {
  const { items } = useCart();
  const count = cartCount(items);

  return (
    <Link href="/cart" className="hover:text-white">
      Cart{count > 0 ? ` (${count})` : ""}
    </Link>
  );
}
```

Modify `src/app/layout.tsx`: add imports, replace the `{/* cart-link */}` anchor with `<CartLink />`, and wrap the body content:

```tsx
import { CartLink } from "@/components/cart-link";
import { CartProvider } from "@/components/cart-provider";
```

```tsx
      <body className="min-h-screen bg-black text-zinc-100 antialiased">
        <CartProvider>
          <Nav />
          {children}
          <Footer />
        </CartProvider>
      </body>
```

- [ ] **Step 6: Write the cart page**

`src/app/cart/page.tsx`:

```tsx
import type { Metadata } from "next";
import { CartView } from "@/components/cart-view";
import { loadProducts } from "@/lib/content";

export const metadata: Metadata = { title: "Cart — PHEVE" };

export default function CartPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-black tracking-wide">Cart</h1>
      <CartView products={loadProducts()} />
    </main>
  );
}
```

`src/components/cart-view.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/components/cart-provider";
import { cartSubtotalCents } from "@/lib/cart";
import type { Product } from "@/lib/content";
import { formatCents } from "@/lib/money";

export function CartView({ products }: { products: Product[] }) {
  const { items, remove, setQty } = useCart();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Drop lines for products no longer in the catalog (stale localStorage).
  const validItems = items.filter((line) => products.some((p) => p.slug === line.slug));

  if (validItems.length === 0) {
    return (
      <p className="mt-8 text-zinc-500">
        Your cart is empty.{" "}
        <Link href="/store" className="underline hover:text-white">
          Hit the store
        </Link>
        .
      </p>
    );
  }

  async function checkout() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: validItems }),
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (res.ok && data.url) {
        window.location.assign(data.url);
        return;
      }
      setError(data.error ?? "Checkout isn't available right now — try again shortly.");
    } catch {
      setError("Checkout isn't available right now — try again shortly.");
    }
    setBusy(false);
  }

  return (
    <div className="mt-8">
      <ul className="space-y-4">
        {validItems.map((line) => {
          const product = products.find((p) => p.slug === line.slug);
          if (!product) return null;
          return (
            <li
              key={`${line.slug}-${line.variant}`}
              className="flex items-center justify-between gap-4 rounded-lg border border-zinc-800 p-4"
            >
              <div>
                <p className="font-semibold">{product.name}</p>
                <p className="text-sm text-zinc-400">
                  {line.variant} · {formatCents(product.priceCents)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  className="h-8 w-8 rounded border border-zinc-700 hover:bg-zinc-800"
                  onClick={() => setQty(line.slug, line.variant, line.quantity - 1)}
                >
                  −
                </button>
                <span className="w-6 text-center">{line.quantity}</span>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  className="h-8 w-8 rounded border border-zinc-700 hover:bg-zinc-800"
                  onClick={() => setQty(line.slug, line.variant, line.quantity + 1)}
                >
                  +
                </button>
                <button
                  type="button"
                  className="ml-2 text-sm text-zinc-500 underline hover:text-white"
                  onClick={() => remove(line.slug, line.variant)}
                >
                  Remove
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-6 flex items-center justify-between">
        <p className="text-lg">
          Subtotal: <span className="font-bold">{formatCents(cartSubtotalCents(validItems, products))}</span>
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={checkout}
          className="rounded-lg bg-white px-6 py-3 font-bold text-black hover:bg-zinc-200 disabled:opacity-50"
        >
          {busy ? "Heading to checkout…" : "Checkout"}
        </button>
      </div>
      <p className="mt-2 text-sm text-zinc-500">Flat-rate US shipping added at checkout.</p>
      {error ? <p className="mt-4 text-red-400">{error}</p> : null}
    </div>
  );
}
```

- [ ] **Step 7: Verify and run gates**

`pnpm dev` → `/cart` shows the empty state; the nav shows "Cart". (Add-to-cart arrives with the store pages in Task 9; checkout returns an error message until Task 7 — expected for now.)

```bash
pnpm lint && pnpm format:check && pnpm typecheck && pnpm test && pnpm build
```

Expected: all pass.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "Add cart logic, provider, and cart page"
```

---

### Task 7: Checkout API and success page

**Files:**
- Create: `src/lib/stripe.ts`, `src/lib/checkout.ts`, `src/lib/checkout.test.ts`, `src/app/api/checkout/route.ts`, `src/app/store/success/page.tsx`

**Interfaces:**
- Consumes: `checkStock`, `type StockIssue` (Task 5); `cartItemSchema`, `type CartItem`, `MAX_DISTINCT_ITEMS`, `serializeCartMetadata` (Tasks 5–6); `loadProducts` (Task 2); `getDb` (Task 5); `useCart` (Task 6)
- Produces:
  - `getStripe(): Stripe` in `@/lib/stripe`
  - In `@/lib/checkout`: `FLAT_SHIPPING_CENTS = 800`; `checkoutRequestSchema` (`{ items: CartItem[] }`, 1–10 lines); `type CheckoutResult = { ok: true; url: string } | { ok: false; status: 400 | 409; error: string; issues?: StockIssue[] }`; `createCheckoutSession(db: Db, stripe: Stripe, items: CartItem[], origin: string): Promise<CheckoutResult>`
  - HTTP: `POST /api/checkout` with `{ items }` → `200 { url }` | `400/409 { error, issues }`

- [ ] **Step 1: Install Stripe SDK**

```bash
pnpm add stripe@22.3.0
```

- [ ] **Step 2: Write the lazy Stripe client**

`src/lib/stripe.ts`:

```ts
import Stripe from "stripe";

let stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (stripe) return stripe;
  const key = process.env["STRIPE_SECRET_KEY"];
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set — add it to .env.local");
  stripe = new Stripe(key);
  return stripe;
}
```

- [ ] **Step 3: Write failing checkout tests**

`src/lib/checkout.test.ts`:

```ts
import type Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCheckoutSession, FLAT_SHIPPING_CENTS } from "@/lib/checkout";
import type { Db } from "@/lib/db/client";
import { createTestDb } from "@/lib/db/test-helpers";
import { setStock } from "@/lib/inventory";

const sessionCreate = vi.fn();
const fakeStripe = {
  checkout: { sessions: { create: sessionCreate } },
} as unknown as Stripe;

let db: Db;

beforeEach(async () => {
  db = await createTestDb();
  await setStock(db, "logo-tee", "L", 5);
  sessionCreate.mockReset();
  sessionCreate.mockResolvedValue({
    id: "cs_test_1",
    url: "https://checkout.stripe.com/c/pay/cs_test_1",
  });
});

const origin = "https://pheve.com";

describe("createCheckoutSession", () => {
  it("rejects an unknown product slug", async () => {
    const result = await createCheckoutSession(
      db,
      fakeStripe,
      [{ slug: "ghost", variant: "L", quantity: 1 }],
      origin,
    );
    expect(result).toMatchObject({ ok: false, status: 400 });
    expect(sessionCreate).not.toHaveBeenCalled();
  });

  it("rejects an unknown variant", async () => {
    const result = await createCheckoutSession(
      db,
      fakeStripe,
      [{ slug: "logo-tee", variant: "XXS", quantity: 1 }],
      origin,
    );
    expect(result).toMatchObject({ ok: false, status: 400 });
  });

  it("returns 409 with issues when stock is short", async () => {
    const result = await createCheckoutSession(
      db,
      fakeStripe,
      [{ slug: "logo-tee", variant: "L", quantity: 6 }],
      origin,
    );
    expect(result).toMatchObject({
      ok: false,
      status: 409,
      issues: [{ slug: "logo-tee", variant: "L", requested: 6, available: 5 }],
    });
    expect(sessionCreate).not.toHaveBeenCalled();
  });

  it("creates a session with line items, flat shipping, tax, and cart metadata", async () => {
    const result = await createCheckoutSession(
      db,
      fakeStripe,
      [{ slug: "logo-tee", variant: "L", quantity: 2 }],
      origin,
    );
    expect(result).toEqual({ ok: true, url: "https://checkout.stripe.com/c/pay/cs_test_1" });

    const params = sessionCreate.mock.calls[0]?.[0] as Stripe.Checkout.SessionCreateParams;
    expect(params.mode).toBe("payment");
    expect(params.line_items).toEqual([
      {
        quantity: 2,
        price_data: {
          currency: "usd",
          unit_amount: 2500,
          tax_behavior: "exclusive",
          product_data: { name: "PHEVE Logo Tee — L" },
        },
      },
    ]);
    expect(params.shipping_address_collection).toEqual({ allowed_countries: ["US"] });
    expect(
      params.shipping_options?.[0]?.shipping_rate_data?.fixed_amount?.amount,
    ).toBe(FLAT_SHIPPING_CENTS);
    expect(params.automatic_tax).toEqual({ enabled: true });
    expect(params.metadata?.["cart"]).toBe('[{"s":"logo-tee","v":"L","q":2}]');
    expect(params.success_url).toBe("https://pheve.com/store/success");
    expect(params.cancel_url).toBe("https://pheve.com/cart");
  });
});
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `pnpm exec vitest run src/lib/checkout.test.ts`
Expected: FAIL — cannot resolve `@/lib/checkout`.

- [ ] **Step 5: Implement checkout**

`src/lib/checkout.ts`:

```ts
import type Stripe from "stripe";
import { z } from "zod";
import { cartItemSchema, MAX_DISTINCT_ITEMS, serializeCartMetadata, type CartItem } from "@/lib/cart";
import { loadProducts } from "@/lib/content";
import type { Db } from "@/lib/db/client";
import { checkStock, type StockIssue } from "@/lib/inventory";

export const FLAT_SHIPPING_CENTS = 800;

export const checkoutRequestSchema = z.object({
  items: z.array(cartItemSchema).min(1).max(MAX_DISTINCT_ITEMS),
});

export type CheckoutResult =
  | { ok: true; url: string }
  | { ok: false; status: 400 | 409; error: string; issues?: StockIssue[] };

export async function createCheckoutSession(
  db: Db,
  stripe: Stripe,
  items: CartItem[],
  origin: string,
): Promise<CheckoutResult> {
  const products = loadProducts();

  for (const item of items) {
    const product = products.find((p) => p.slug === item.slug);
    if (!product) {
      return { ok: false, status: 400, error: `Unknown product: ${item.slug}` };
    }
    if (!product.variants.includes(item.variant)) {
      return { ok: false, status: 400, error: `Unknown variant ${item.variant} for ${item.slug}` };
    }
  }

  const issues = await checkStock(db, items);
  if (issues.length > 0) {
    return {
      ok: false,
      status: 409,
      error: "Some items in your cart just sold out — adjust quantities and try again",
      issues,
    };
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: items.map((item) => {
      const product = products.find((p) => p.slug === item.slug);
      if (!product) throw new Error(`unreachable: ${item.slug} validated above`);
      return {
        quantity: item.quantity,
        price_data: {
          currency: "usd",
          unit_amount: product.priceCents,
          tax_behavior: "exclusive",
          product_data: { name: `${product.name} — ${item.variant}` },
        },
      };
    }),
    shipping_address_collection: { allowed_countries: ["US"] },
    shipping_options: [
      {
        shipping_rate_data: {
          type: "fixed_amount",
          display_name: "USPS flat rate",
          fixed_amount: { amount: FLAT_SHIPPING_CENTS, currency: "usd" },
        },
      },
    ],
    automatic_tax: { enabled: true },
    metadata: { cart: serializeCartMetadata(items) },
    success_url: `${origin}/store/success`,
    cancel_url: `${origin}/cart`,
  });

  if (!session.url) {
    return { ok: false, status: 400, error: "Stripe did not return a checkout URL" };
  }
  return { ok: true, url: session.url };
}
```

`src/app/api/checkout/route.ts`:

```ts
import { checkoutRequestSchema, createCheckoutSession } from "@/lib/checkout";
import { getDb } from "@/lib/db/client";
import { getStripe } from "@/lib/stripe";

export async function POST(request: Request): Promise<Response> {
  const body = await request.json().catch(() => null);
  const parsed = checkoutRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid cart contents" }, { status: 400 });
  }

  const origin = new URL(request.url).origin;
  const result = await createCheckoutSession(getDb(), getStripe(), parsed.data.items, origin);
  if (!result.ok) {
    return Response.json({ error: result.error, issues: result.issues ?? [] }, { status: result.status });
  }
  return Response.json({ url: result.url });
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `pnpm exec vitest run src/lib/checkout.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 7: Write the success page**

`src/app/store/success/page.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useCart } from "@/components/cart-provider";

export default function SuccessPage() {
  const { clear } = useCart();

  useEffect(() => {
    clear();
    // clear() is stable for the life of the page; run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="mx-auto max-w-3xl px-4 py-24 text-center">
      <h1 className="text-3xl font-black tracking-wide">Order in. You rule. 🤘</h1>
      <p className="mt-4 text-zinc-400">
        Stripe is emailing your receipt. We pack orders between gigs — it’ll ship soon.
      </p>
      <Link href="/" className="mt-8 inline-block underline hover:text-white">
        Back to the band
      </Link>
    </main>
  );
}
```

- [ ] **Step 8: Run gates and commit**

```bash
pnpm lint && pnpm format:check && pnpm typecheck && pnpm test && pnpm build
git add -A
git commit -m "Add Stripe checkout session API and success page"
```

---

### Task 8: Stripe webhook

**Files:**
- Create: `src/lib/webhook.ts`, `src/lib/webhook.test.ts`, `src/lib/email.ts`, `src/lib/booking.ts`, `src/app/api/webhooks/stripe/route.ts`, `src/app/api/webhooks/stripe/route.test.ts`

**Interfaces:**
- Consumes: `parseCartMetadata`, `type CartItem` (Task 6); `recordOrderAndDecrement` (Task 5); `getProduct` (Task 2); `getStripe` (Task 7); `getDb` (Task 5)
- Produces:
  - `processCheckoutCompleted(db: Db, sessionId: string, cartMetadata: string | undefined): Promise<{ status: "recorded" | "duplicate"; items: CartItem[] }>` in `@/lib/webhook` (throws on missing/malformed metadata)
  - In `@/lib/booking`: `bookingSchema`, `type BookingInquiry = { name: string; email: string; date: string; eventType: string; message: string }` (used by Task 11)
  - In `@/lib/email`: `requireEnv(name: string): string`, `sendBookingEmail(inquiry: BookingInquiry): Promise<void>`, `sendOrderEmail(sessionId: string, items: CartItem[], customerEmail: string | null): Promise<void>`, `addSubscriber(email: string): Promise<void>`
  - HTTP: `POST /api/webhooks/stripe` — 400 bad signature, 500 processing failure (Stripe retries), 200 otherwise

- [ ] **Step 1: Install Resend**

```bash
pnpm add resend@6.17.1
```

- [ ] **Step 2: Write booking schema and email module**

`src/lib/booking.ts`:

```ts
import { z } from "zod";

export const bookingSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.email(),
  date: z.string().trim().min(1).max(200),
  eventType: z.string().trim().min(1).max(100),
  message: z.string().trim().min(1).max(5000),
});
export type BookingInquiry = z.infer<typeof bookingSchema>;
```

`src/lib/email.ts` (boundary wrapper — exercised via e2e and mocked in unit tests):

```ts
import { Resend } from "resend";
import type { BookingInquiry } from "@/lib/booking";
import type { CartItem } from "@/lib/cart";
import { getProduct } from "@/lib/content";

let resend: Resend | null = null;

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set — add it to .env.local / Vercel env vars`);
  return value;
}

function getResend(): Resend {
  resend ??= new Resend(requireEnv("RESEND_API_KEY"));
  return resend;
}

export async function sendBookingEmail(inquiry: BookingInquiry): Promise<void> {
  const { error } = await getResend().emails.send({
    from: requireEnv("EMAIL_FROM"),
    to: requireEnv("BAND_EMAIL"),
    replyTo: inquiry.email,
    subject: `Booking inquiry: ${inquiry.eventType} — ${inquiry.name}`,
    text: [
      `Name: ${inquiry.name}`,
      `Email: ${inquiry.email}`,
      `Date: ${inquiry.date}`,
      `Event type: ${inquiry.eventType}`,
      "",
      inquiry.message,
    ].join("\n"),
  });
  if (error) throw new Error(`Booking email failed: ${error.message}`);
}

export async function sendOrderEmail(
  sessionId: string,
  items: CartItem[],
  customerEmail: string | null,
): Promise<void> {
  const lines = items.map((item) => {
    const name = getProduct(item.slug)?.name ?? item.slug;
    return `${item.quantity} × ${name} (${item.variant})`;
  });
  const { error } = await getResend().emails.send({
    from: requireEnv("EMAIL_FROM"),
    to: requireEnv("BAND_EMAIL"),
    subject: `New merch order (${lines.length} item${lines.length === 1 ? "" : "s"})`,
    text: [
      ...lines,
      "",
      `Buyer: ${customerEmail ?? "see Stripe dashboard"}`,
      `Shipping address: Stripe dashboard → Payments → session ${sessionId}`,
    ].join("\n"),
  });
  if (error) throw new Error(`Order email failed: ${error.message}`);
}

export async function addSubscriber(email: string): Promise<void> {
  const { error } = await getResend().contacts.create({
    email,
    audienceId: requireEnv("RESEND_AUDIENCE_ID"),
  });
  if (error && !error.message.toLowerCase().includes("already")) {
    throw new Error(`Subscribe failed: ${error.message}`);
  }
}
```

- [ ] **Step 3: Write failing webhook tests**

`src/lib/webhook.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { serializeCartMetadata } from "@/lib/cart";
import type { Db } from "@/lib/db/client";
import { createTestDb } from "@/lib/db/test-helpers";
import { getStockMap, setStock } from "@/lib/inventory";
import { processCheckoutCompleted } from "@/lib/webhook";

let db: Db;

beforeEach(async () => {
  db = await createTestDb();
  await setStock(db, "logo-tee", "L", 5);
});

const cart = serializeCartMetadata([{ slug: "logo-tee", variant: "L", quantity: 2 }]);

describe("processCheckoutCompleted", () => {
  it("records the order and decrements stock", async () => {
    const result = await processCheckoutCompleted(db, "cs_1", cart);
    expect(result.status).toBe("recorded");
    expect(result.items).toEqual([{ slug: "logo-tee", variant: "L", quantity: 2 }]);
    expect(await getStockMap(db, "logo-tee")).toEqual({ L: 3 });
  });

  it("is idempotent on replayed events", async () => {
    await processCheckoutCompleted(db, "cs_1", cart);
    const replay = await processCheckoutCompleted(db, "cs_1", cart);
    expect(replay.status).toBe("duplicate");
    expect(await getStockMap(db, "logo-tee")).toEqual({ L: 3 });
  });

  it("throws on missing metadata", async () => {
    await expect(processCheckoutCompleted(db, "cs_2", undefined)).rejects.toThrow(/metadata/);
  });

  it("throws on malformed metadata", async () => {
    await expect(processCheckoutCompleted(db, "cs_3", "garbage")).rejects.toThrow();
  });
});
```

`src/app/api/webhooks/stripe/route.test.ts` (signature paths only — processing is covered above, the full loop by e2e):

```ts
import Stripe from "stripe";
import { beforeEach, describe, expect, it } from "vitest";
import { POST } from "@/app/api/webhooks/stripe/route";

const SECRET = "whsec_test_secret";

function signedRequest(payload: string, secret: string): Request {
  const stripe = new Stripe("sk_test_dummy");
  const signature = stripe.webhooks.generateTestHeaderString({ payload, secret });
  return new Request("http://localhost/api/webhooks/stripe", {
    method: "POST",
    headers: { "stripe-signature": signature },
    body: payload,
  });
}

beforeEach(() => {
  process.env["STRIPE_WEBHOOK_SECRET"] = SECRET;
  process.env["STRIPE_SECRET_KEY"] = "sk_test_dummy";
});

describe("POST /api/webhooks/stripe", () => {
  it("rejects a missing signature header", async () => {
    const res = await POST(
      new Request("http://localhost/api/webhooks/stripe", { method: "POST", body: "{}" }),
    );
    expect(res.status).toBe(400);
  });

  it("rejects a payload signed with the wrong secret", async () => {
    const res = await POST(signedRequest("{}", "whsec_wrong"));
    expect(res.status).toBe(400);
  });

  it("acknowledges event types it does not handle", async () => {
    const payload = JSON.stringify({
      id: "evt_1",
      object: "event",
      type: "payment_intent.succeeded",
      data: { object: {} },
    });
    const res = await POST(signedRequest(payload, SECRET));
    expect(res.status).toBe(200);
  });
});
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `pnpm exec vitest run src/lib/webhook.test.ts src/app/api/webhooks/stripe/route.test.ts`
Expected: FAIL — modules don't exist.

- [ ] **Step 5: Implement webhook processing and route**

`src/lib/webhook.ts`:

```ts
import { parseCartMetadata, type CartItem } from "@/lib/cart";
import type { Db } from "@/lib/db/client";
import { recordOrderAndDecrement } from "@/lib/inventory";

export async function processCheckoutCompleted(
  db: Db,
  sessionId: string,
  cartMetadata: string | undefined,
): Promise<{ status: "recorded" | "duplicate"; items: CartItem[] }> {
  if (!cartMetadata) {
    throw new Error(`Session ${sessionId} has no cart metadata — was it created by this site?`);
  }
  const items = parseCartMetadata(cartMetadata);
  const status = await recordOrderAndDecrement(db, sessionId, items);
  return { status, items };
}
```

`src/app/api/webhooks/stripe/route.ts`:

```ts
import type Stripe from "stripe";
import { getDb } from "@/lib/db/client";
import { sendOrderEmail } from "@/lib/email";
import { getStripe } from "@/lib/stripe";
import { processCheckoutCompleted } from "@/lib/webhook";

export async function POST(request: Request): Promise<Response> {
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Missing stripe-signature header", { status: 400 });

  let event: Stripe.Event;
  try {
    const secret = process.env["STRIPE_WEBHOOK_SECRET"];
    if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");
    event = getStripe().webhooks.constructEvent(payload, signature, secret);
  } catch (err) {
    console.error("webhook signature verification failed", err);
    return new Response("Invalid signature", { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    try {
      const { status, items } = await processCheckoutCompleted(
        getDb(),
        session.id,
        session.metadata?.["cart"],
      );
      if (status === "recorded") {
        try {
          await sendOrderEmail(session.id, items, session.customer_details?.email ?? null);
        } catch (emailErr) {
          // The order is recorded and visible in the Stripe dashboard. Returning 5xx here
          // would make Stripe retry and hit the duplicate path without resending the email,
          // so log loudly instead of failing the webhook.
          console.error(`order notification email failed for ${session.id}`, emailErr);
        }
      }
    } catch (err) {
      console.error(`webhook processing failed for ${session.id}`, err);
      return new Response("Processing failed", { status: 500 });
    }
  }

  return new Response("ok");
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `pnpm exec vitest run src/lib/webhook.test.ts src/app/api/webhooks/stripe/route.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 7: Run gates and commit**

```bash
pnpm lint && pnpm format:check && pnpm typecheck && pnpm test && pnpm build
git add -A
git commit -m "Add idempotent Stripe webhook with order notification email"
```

---

### Task 9: Store pages

**Files:**
- Create: `src/app/store/page.tsx`, `src/app/store/[slug]/page.tsx`, `src/components/add-to-cart.tsx`

**Interfaces:**
- Consumes: `loadProducts`, `getProduct`, `type Product` (Task 2); `getAllStock`, `getStockMap` (Task 5); `getDb` (Task 5); `useCart` (Task 6); `formatCents` (Task 6)
- Produces: nothing used by later tasks (e2e drives these pages)

- [ ] **Step 1: Write the store grid page**

`src/app/store/page.tsx`:

```tsx
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { loadProducts } from "@/lib/content";
import { getDb } from "@/lib/db/client";
import { getAllStock } from "@/lib/inventory";
import { formatCents } from "@/lib/money";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Store — PHEVE" };

export default async function StorePage() {
  const products = loadProducts();

  let stock: Record<string, Record<string, number>> | null = null;
  try {
    stock = await getAllStock(getDb());
  } catch (err) {
    console.error("store stock unavailable", err);
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-3xl font-black tracking-wide">Merch</h1>
      {stock === null ? (
        <p className="mt-4 rounded-lg border border-yellow-900 bg-yellow-950/40 p-4 text-yellow-200">
          The store is napping — browsing only for now. Check back soon.
        </p>
      ) : null}
      <ul className="mt-8 grid grid-cols-2 gap-6 md:grid-cols-3">
        {products.map((product) => {
          const variants = stock?.[product.slug] ?? {};
          const soldOut =
            stock !== null && product.variants.every((v) => (variants[v] ?? 0) === 0);
          return (
            <li key={product.slug}>
              <Link
                href={`/store/${product.slug}`}
                className="block rounded-lg border border-zinc-800 p-4 hover:border-zinc-600"
              >
                <div className="relative h-40 w-full">
                  <Image
                    src={product.images[0] ?? "/images/pheve-logo.png"}
                    alt={product.name}
                    fill
                    className="object-contain"
                    sizes="(max-width: 768px) 50vw, 33vw"
                  />
                </div>
                <p className="mt-3 font-semibold">{product.name}</p>
                <p className="text-zinc-400">{formatCents(product.priceCents)}</p>
                {soldOut ? (
                  <p className="mt-1 text-sm font-bold uppercase text-red-400">Sold out</p>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
```

- [ ] **Step 2: Write the add-to-cart component**

`src/components/add-to-cart.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useCart } from "@/components/cart-provider";
import type { Product } from "@/lib/content";

export function AddToCart({ product, stock }: { product: Product; stock: Record<string, number> }) {
  const { add } = useCart();
  const [variant, setVariant] = useState(product.variants[0] ?? "");
  const [added, setAdded] = useState(false);

  const available = (stock[variant] ?? 0) > 0;

  function handleAdd() {
    add({ slug: product.slug, variant, quantity: 1 });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <div className="mt-6">
      {product.variants.length > 1 ? (
        <label className="block">
          <span className="text-sm uppercase tracking-widest text-zinc-500">Size</span>
          <select
            value={variant}
            onChange={(e) => setVariant(e.target.value)}
            className="mt-1 block rounded border border-zinc-700 bg-zinc-900 px-3 py-2"
          >
            {product.variants.map((v) => (
              <option key={v} value={v} disabled={(stock[v] ?? 0) === 0}>
                {v}
                {(stock[v] ?? 0) === 0 ? " — sold out" : ""}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <button
        type="button"
        disabled={!available}
        onClick={handleAdd}
        className="mt-4 rounded-lg bg-white px-6 py-3 font-bold text-black hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {available ? (added ? "Added ✓" : "Add to cart") : "Sold out"}
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Write the product detail page**

`src/app/store/[slug]/page.tsx`:

```tsx
import Image from "next/image";
import { notFound } from "next/navigation";
import { AddToCart } from "@/components/add-to-cart";
import { getProduct } from "@/lib/content";
import { getDb } from "@/lib/db/client";
import { getStockMap } from "@/lib/inventory";
import { formatCents } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) notFound();

  let stock: Record<string, number> | null = null;
  try {
    stock = await getStockMap(getDb(), slug);
  } catch (err) {
    console.error(`stock unavailable for ${slug}`, err);
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <div className="relative h-72 w-full">
        <Image
          src={product.images[0] ?? "/images/pheve-logo.png"}
          alt={product.name}
          fill
          priority
          className="object-contain"
          sizes="(max-width: 768px) 100vw, 768px"
        />
      </div>
      <h1 className="mt-6 text-3xl font-black tracking-wide">{product.name}</h1>
      <p className="mt-1 text-xl text-zinc-400">{formatCents(product.priceCents)}</p>
      <p className="mt-4 text-zinc-300">{product.description}</p>
      {stock === null ? (
        <p className="mt-6 rounded-lg border border-yellow-900 bg-yellow-950/40 p-4 text-yellow-200">
          The store is napping — you can’t buy right now. Check back soon.
        </p>
      ) : (
        <AddToCart product={product} stock={stock} />
      )}
    </main>
  );
}
```

- [ ] **Step 4: Verify with a local database**

Point `DATABASE_URL` in `.env.local` at the dev Neon database (created in Task 15 prerequisites, or any local Postgres), run the migration and stock a product:

```bash
pnpm db:migrate
pnpm restock logo-tee L 10   # restock script arrives in Task 13; until then insert via psql:
# psql "$DATABASE_URL" -c "INSERT INTO inventory VALUES ('logo-tee','L',10) ON CONFLICT (product_slug, variant) DO UPDATE SET stock = 10;"
pnpm dev
```

Expected: `/store` shows three products ("Sold out" on unstocked ones), `/store/logo-tee` lets you pick L and add to cart, nav badge increments, `/cart` shows the line. With `DATABASE_URL` unset: the yellow "napping" banner appears and buying is disabled — pages still render.

- [ ] **Step 5: Run gates and commit**

```bash
pnpm lint && pnpm format:check && pnpm typecheck && pnpm test && pnpm build
git add -A
git commit -m "Add store grid and product detail pages with live stock"
```

---

### Task 10: Gallery page

**Files:**
- Create: `src/app/gallery/page.tsx`

**Interfaces:**
- Consumes: `loadGallery` (Task 2)
- Produces: nothing used by later tasks

- [ ] **Step 1: Write the page**

`src/app/gallery/page.tsx`:

```tsx
import type { Metadata } from "next";
import Image from "next/image";
import { loadGallery } from "@/lib/content";

export const metadata: Metadata = { title: "Gallery — PHEVE" };

export default function GalleryPage() {
  const gallery = loadGallery();

  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-3xl font-black tracking-wide">Gallery</h1>

      <ul className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3">
        {gallery.photos.map((photo) => (
          <li key={photo.src} className="relative aspect-square overflow-hidden rounded-lg">
            <Image
              src={photo.src}
              alt={photo.alt}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 50vw, 33vw"
            />
          </li>
        ))}
      </ul>

      {gallery.videos.length > 0 ? (
        <section className="mt-12">
          <h2 className="text-xl font-bold">Videos</h2>
          <ul className="mt-4 grid gap-6 md:grid-cols-2">
            {gallery.videos.map((video) => (
              <li key={video.youtubeId} className="aspect-video">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}`}
                  title={video.title}
                  allowFullScreen
                  className="h-full w-full rounded-lg border-0"
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
```

- [ ] **Step 2: Verify, run gates, commit**

`pnpm dev` → `/gallery` renders the placeholder photo grid; no videos section (seed list is empty). Then:

```bash
pnpm lint && pnpm format:check && pnpm typecheck && pnpm test && pnpm build
git add -A
git commit -m "Add gallery page"
```

---

### Task 11: Booking form with rate limiting

**Files:**
- Create: `src/lib/rate-limit.ts`, `src/lib/rate-limit.test.ts`, `src/app/api/booking/route.ts`, `src/components/booking-form.tsx`, `src/app/booking/page.tsx`

**Interfaces:**
- Consumes: `bookingSchema`, `type BookingInquiry` (Task 8); `sendBookingEmail` (Task 8); `getDb`, `type Db` (Task 5); `rateLimits` table (Task 5)
- Produces:
  - `checkRateLimit(db: Db, key: string, limit: number, windowSeconds: number, now?: Date): Promise<boolean>` in `@/lib/rate-limit` — fixed window; `true` = allowed (and counted)
  - HTTP: `POST /api/booking` → `200 { ok: true }` | `400 { error }` | `429 { error }`

- [ ] **Step 1: Write failing rate-limit tests**

`src/lib/rate-limit.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/lib/db/client";
import { createTestDb } from "@/lib/db/test-helpers";
import { checkRateLimit } from "@/lib/rate-limit";

let db: Db;

beforeEach(async () => {
  db = await createTestDb();
});

const t0 = new Date("2026-07-04T12:00:00Z");
const later = (seconds: number) => new Date(t0.getTime() + seconds * 1000);

describe("checkRateLimit", () => {
  it("allows up to the limit within a window", async () => {
    expect(await checkRateLimit(db, "booking:1.2.3.4", 3, 3600, t0)).toBe(true);
    expect(await checkRateLimit(db, "booking:1.2.3.4", 3, 3600, later(10))).toBe(true);
    expect(await checkRateLimit(db, "booking:1.2.3.4", 3, 3600, later(20))).toBe(true);
    expect(await checkRateLimit(db, "booking:1.2.3.4", 3, 3600, later(30))).toBe(false);
  });

  it("resets after the window elapses", async () => {
    for (let i = 0; i < 3; i += 1) {
      await checkRateLimit(db, "booking:1.2.3.4", 3, 3600, t0);
    }
    expect(await checkRateLimit(db, "booking:1.2.3.4", 3, 3600, later(3601))).toBe(true);
  });

  it("tracks keys independently", async () => {
    for (let i = 0; i < 3; i += 1) {
      await checkRateLimit(db, "booking:1.2.3.4", 3, 3600, t0);
    }
    expect(await checkRateLimit(db, "booking:5.6.7.8", 3, 3600, t0)).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run src/lib/rate-limit.test.ts`
Expected: FAIL — cannot resolve `@/lib/rate-limit`.

- [ ] **Step 3: Implement the rate limiter**

`src/lib/rate-limit.ts`:

```ts
import { eq } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { rateLimits } from "@/lib/db/schema";

export async function checkRateLimit(
  db: Db,
  key: string,
  limit: number,
  windowSeconds: number,
  now: Date = new Date(),
): Promise<boolean> {
  const rows = await db.select().from(rateLimits).where(eq(rateLimits.key, key));
  const row = rows[0];

  const windowExpired =
    !row || now.getTime() - row.windowStart.getTime() >= windowSeconds * 1000;
  if (windowExpired) {
    await db
      .insert(rateLimits)
      .values({ key, count: 1, windowStart: now })
      .onConflictDoUpdate({ target: rateLimits.key, set: { count: 1, windowStart: now } });
    return true;
  }

  if (row.count < limit) {
    await db.update(rateLimits).set({ count: row.count + 1 }).where(eq(rateLimits.key, key));
    return true;
  }
  return false;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run src/lib/rate-limit.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Write the booking API route**

`src/app/api/booking/route.ts`:

```ts
import { z } from "zod";
import { bookingSchema } from "@/lib/booking";
import { getDb } from "@/lib/db/client";
import { sendBookingEmail } from "@/lib/email";
import { checkRateLimit } from "@/lib/rate-limit";

const honeypotSchema = z.object({ website: z.string().optional() }).loose();

export async function POST(request: Request): Promise<Response> {
  const body = await request.json().catch(() => null);

  // Honeypot: bots fill every field. Pretend success, send nothing.
  const honeypot = honeypotSchema.safeParse(body);
  if (honeypot.success && honeypot.data.website) {
    return Response.json({ ok: true });
  }

  const parsed = bookingSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Please fill in every field with valid values" }, { status: 400 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const allowed = await checkRateLimit(getDb(), `booking:${ip}`, 5, 3600);
  if (!allowed) {
    return Response.json({ error: "Too many requests — try again in an hour" }, { status: 429 });
  }

  await sendBookingEmail(parsed.data);
  return Response.json({ ok: true });
}
```

- [ ] **Step 6: Write the booking form and page**

`src/components/booking-form.tsx`:

```tsx
"use client";

import { useState, type FormEvent } from "react";

const inputClass =
  "mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 focus:border-zinc-500 focus:outline-none";

export function BookingForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    const formData = new FormData(e.currentTarget);
    const payload = Object.fromEntries(formData.entries());
    try {
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setStatus("sent");
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setErrorMessage(data.error ?? "Something went wrong — try again.");
      setStatus("error");
    } catch {
      setErrorMessage("Something went wrong — try again.");
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <p className="mt-8 rounded-lg border border-green-900 bg-green-950/40 p-6 text-green-200">
        Got it — we’ll get back to you within a couple of days. 🤘
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-4">
      <label className="block">
        <span className="text-sm uppercase tracking-widest text-zinc-500">Your name</span>
        <input name="name" required maxLength={200} className={inputClass} />
      </label>
      <label className="block">
        <span className="text-sm uppercase tracking-widest text-zinc-500">Email</span>
        <input name="email" type="email" required className={inputClass} />
      </label>
      <label className="block">
        <span className="text-sm uppercase tracking-widest text-zinc-500">Event date (rough is fine)</span>
        <input name="date" required maxLength={200} placeholder="e.g. Saturday, Oct 10" className={inputClass} />
      </label>
      <label className="block">
        <span className="text-sm uppercase tracking-widest text-zinc-500">Event type</span>
        <input name="eventType" required maxLength={100} placeholder="Wedding, bar, private party…" className={inputClass} />
      </label>
      <label className="block">
        <span className="text-sm uppercase tracking-widest text-zinc-500">Tell us about it</span>
        <textarea name="message" required maxLength={5000} rows={5} className={inputClass} />
      </label>
      {/* Honeypot — hidden from humans, irresistible to bots */}
      <input
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />
      <button
        type="submit"
        disabled={status === "sending"}
        className="rounded-lg bg-white px-6 py-3 font-bold text-black hover:bg-zinc-200 disabled:opacity-50"
      >
        {status === "sending" ? "Sending…" : "Send inquiry"}
      </button>
      {status === "error" ? <p className="text-red-400">{errorMessage}</p> : null}
    </form>
  );
}
```

`src/app/booking/page.tsx`:

```tsx
import type { Metadata } from "next";
import { BookingForm } from "@/components/booking-form";

export const metadata: Metadata = { title: "Book PHEVE" };

export default function BookingPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-black tracking-wide">Book the Band</h1>
      <p className="mt-4 text-zinc-400">
        Weddings, bars, festivals, backyard blowouts — if it has power outlets, we’ll play it.
        Tell us what you’re planning.
      </p>
      <BookingForm />
    </main>
  );
}
```

- [ ] **Step 7: Verify, run gates, commit**

`pnpm dev` → `/booking` renders; with `RESEND_API_KEY` set in `.env.local`, submitting sends a real email to `BAND_EMAIL` and shows the success panel; without it, the form shows the error state (fail fast — no silent success). Then:

```bash
pnpm lint && pnpm format:check && pnpm typecheck && pnpm test && pnpm build
git add -A
git commit -m "Add booking form with honeypot and DB-backed rate limit"
```

---

### Task 12: Mailing list signup

**Files:**
- Create: `src/app/api/subscribe/route.ts`, `src/components/mailing-list-form.tsx`
- Modify: `src/app/page.tsx` (insert `<MailingListForm />` at the `{/* mailing-list */}` anchor)

**Interfaces:**
- Consumes: `addSubscriber` (Task 8)
- Produces: HTTP `POST /api/subscribe` with `{ email }` → `200 { ok: true }` | `400 { error }`

- [ ] **Step 1: Write the subscribe route**

`src/app/api/subscribe/route.ts`:

```ts
import { z } from "zod";
import { addSubscriber } from "@/lib/email";

const subscribeSchema = z.object({ email: z.email() });

export async function POST(request: Request): Promise<Response> {
  const body = await request.json().catch(() => null);
  const parsed = subscribeSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Enter a valid email address" }, { status: 400 });
  }
  await addSubscriber(parsed.data.email);
  return Response.json({ ok: true });
}
```

- [ ] **Step 2: Write the form component**

`src/components/mailing-list-form.tsx`:

```tsx
"use client";

import { useState, type FormEvent } from "react";

export function MailingListForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    const email = new FormData(e.currentTarget).get("email");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setStatus(res.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") {
    return <p className="mt-12 text-green-300">You’re on the list. See you up front. 🤘</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto mt-12 flex max-w-md gap-2">
      <label className="sr-only" htmlFor="mailing-list-email">
        Email address
      </label>
      <input
        id="mailing-list-email"
        name="email"
        type="email"
        required
        placeholder="you@example.com"
        className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 focus:border-zinc-500 focus:outline-none"
      />
      <button
        type="submit"
        disabled={status === "sending"}
        className="whitespace-nowrap rounded bg-white px-4 py-2 font-bold text-black hover:bg-zinc-200 disabled:opacity-50"
      >
        Get show alerts
      </button>
      {status === "error" ? <p className="text-sm text-red-400">Try again?</p> : null}
    </form>
  );
}
```

- [ ] **Step 3: Add the form to the home page**

In `src/app/page.tsx`, add the import and replace the `{/* mailing-list */}` anchor:

```tsx
import { MailingListForm } from "@/components/mailing-list-form";
```

```tsx
      <MailingListForm />
```

- [ ] **Step 4: Verify, run gates, commit**

`pnpm dev` → home page shows the signup; with `RESEND_API_KEY` + `RESEND_AUDIENCE_ID` set, a submission appears in the Resend Audience dashboard; a duplicate email still reports success. Then:

```bash
pnpm lint && pnpm format:check && pnpm typecheck && pnpm test && pnpm build
git add -A
git commit -m "Add mailing list signup backed by Resend audience"
```

---

### Task 13: Restock script

**Files:**
- Create: `scripts/restock.ts`, `scripts/restock.test.ts`

**Interfaces:**
- Consumes: `setStock`, `getStockMap` (Task 5); `getDb`, `closeDb` (Task 5); `loadProducts`, `type Product` (Task 2)
- Produces: `parseRestockArgs(argv: string[], products: Product[]): { slug: string; variant: string; stock: number }` (exported for tests); CLI `pnpm restock <slug> <variant> <qty>`

- [ ] **Step 1: Write failing tests**

`scripts/restock.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { Product } from "@/lib/content";
import { parseRestockArgs } from "./restock";

const products: Product[] = [
  {
    slug: "logo-tee",
    name: "PHEVE Logo Tee",
    priceCents: 2500,
    description: "x",
    variants: ["S", "L"],
    images: ["/images/pheve-logo.png"],
  },
];

describe("parseRestockArgs", () => {
  it("parses valid args", () => {
    expect(parseRestockArgs(["logo-tee", "L", "25"], products)).toEqual({
      slug: "logo-tee",
      variant: "L",
      stock: 25,
    });
  });

  it("rejects a slug not in the catalog", () => {
    expect(() => parseRestockArgs(["ghost", "L", "25"], products)).toThrow(/ghost/);
  });

  it("rejects a variant the product does not have", () => {
    expect(() => parseRestockArgs(["logo-tee", "XXL", "25"], products)).toThrow(/XXL/);
  });

  it("rejects a negative or non-numeric quantity", () => {
    expect(() => parseRestockArgs(["logo-tee", "L", "-1"], products)).toThrow(/quantity/i);
    expect(() => parseRestockArgs(["logo-tee", "L", "lots"], products)).toThrow(/quantity/i);
  });

  it("rejects missing args with a usage message", () => {
    expect(() => parseRestockArgs(["logo-tee"], products)).toThrow(/usage/i);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run scripts/restock.test.ts`
Expected: FAIL — `./restock` has no `parseRestockArgs` export.

- [ ] **Step 3: Implement the script**

`scripts/restock.ts`:

```ts
import { loadProducts, type Product } from "@/lib/content";
import { closeDb, getDb } from "@/lib/db/client";
import { getStockMap, setStock } from "@/lib/inventory";

const USAGE = "Usage: pnpm restock <slug> <variant> <qty>   e.g. pnpm restock logo-tee L 25";

export function parseRestockArgs(
  argv: string[],
  products: Product[],
): { slug: string; variant: string; stock: number } {
  const [slug, variant, qty] = argv;
  if (!slug || !variant || qty === undefined) throw new Error(USAGE);

  const product = products.find((p) => p.slug === slug);
  if (!product) {
    const known = products.map((p) => p.slug).join(", ");
    throw new Error(`Unknown product "${slug}". Catalog: ${known}`);
  }
  if (!product.variants.includes(variant)) {
    throw new Error(`Unknown variant "${variant}" for ${slug}. Variants: ${product.variants.join(", ")}`);
  }
  const stock = Number(qty);
  if (!Number.isInteger(stock) || stock < 0 || stock > 10_000) {
    throw new Error(`Quantity must be an integer between 0 and 10000, got "${qty}"`);
  }
  return { slug, variant, stock };
}

async function main(): Promise<void> {
  const { slug, variant, stock } = parseRestockArgs(process.argv.slice(2), loadProducts());
  const db = getDb();
  await setStock(db, slug, variant, stock);
  const current = await getStockMap(db, slug);
  console.log(`${slug} stock is now:`, current);
  await closeDb();
}

// Only run as a CLI, not when imported by tests.
if (process.argv[1]?.endsWith("restock.ts")) {
  main().catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run scripts/restock.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Verify against the dev database**

```bash
pnpm restock logo-tee L 25
```

Expected output: `logo-tee stock is now: { L: 25 }` (plus other variants if previously set). `pnpm restock ghost L 5` prints the catalog error and exits non-zero.

- [ ] **Step 6: Run gates and commit**

```bash
pnpm lint && pnpm format:check && pnpm typecheck && pnpm test
git add -A
git commit -m "Add restock CLI script"
```

---

### Task 14: Playwright end-to-end tests

E2E runs **locally only** (needs real test-mode Stripe/Resend keys and `stripe listen`); CI runs unit tests and build. The purchase test drives Stripe's hosted checkout page — Stripe's input `name` attributes have been stable for years, but if Stripe changes its markup, fix selectors here rather than weakening assertions.

**Files:**
- Create: `playwright.config.ts`, `e2e/purchase.spec.ts`, `e2e/booking.spec.ts`

**Interfaces:**
- Consumes: the running app (all previous tasks); env from `.env.local`
- Produces: `pnpm e2e`

**Local prerequisites (document in commit message if any are missing):**
1. `.env.local` filled in per `.env.example` (test-mode Stripe keys).
2. Stripe Tax enabled in the test dashboard (Settings → Tax) and an origin address set.
3. Stock present: `pnpm restock logo-tee L 10`.
4. Webhook forwarding in a second terminal: `stripe listen --forward-to localhost:3000/api/webhooks/stripe` — copy the printed `whsec_…` into `STRIPE_WEBHOOK_SECRET` in `.env.local`.

- [ ] **Step 1: Install Playwright**

```bash
pnpm add -D @playwright/test@1.61.1
pnpm exec playwright install chromium
```

- [ ] **Step 2: Write the config**

`playwright.config.ts`:

```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  timeout: 90_000,
  use: { baseURL: "http://localhost:3000" },
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
```

- [ ] **Step 3: Write the purchase flow test**

`e2e/purchase.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

const hasStripeEnv = Boolean(process.env["STRIPE_SECRET_KEY"]?.startsWith("sk_test_"));

test.describe("merch purchase", () => {
  test.skip(!hasStripeEnv, "Requires test-mode Stripe env — see Task 14 prerequisites");

  test("browse → cart → Stripe Checkout → success", async ({ page }) => {
    await page.goto("/store");
    await page.getByRole("link", { name: /PHEVE Logo Tee/i }).click();
    await page.getByLabel(/size/i).selectOption("L");
    await page.getByRole("button", { name: /add to cart/i }).click();

    await page.goto("/cart");
    await expect(page.getByText("PHEVE Logo Tee")).toBeVisible();
    await page.getByRole("button", { name: /checkout/i }).click();

    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30_000 });
    await page.locator('input[name="email"]').fill("fan@example.com");
    await page.locator('input[name="shippingName"]').fill("Test Fan");
    await page.locator('input[name="shippingAddressLine1"]').fill("123 Main St");
    await page.locator('input[name="shippingLocality"]').fill("Cincinnati");
    await page.locator('input[name="shippingPostalCode"]').fill("45202");
    await page.locator('select[name="shippingAdministrativeArea"]').selectOption("OH");
    await page.locator('input[name="cardNumber"]').fill("4242 4242 4242 4242");
    await page.locator('input[name="cardExpiry"]').fill("12 / 34");
    await page.locator('input[name="cardCvc"]').fill("123");
    const billingName = page.locator('input[name="billingName"]');
    if (await billingName.isVisible()) {
      await billingName.fill("Test Fan");
    }
    await page.getByTestId("hosted-payment-submit-button").click();

    await page.waitForURL(/\/store\/success/, { timeout: 45_000 });
    await expect(page.getByText(/order in/i)).toBeVisible();
  });
});
```

- [ ] **Step 4: Write the booking flow test**

`e2e/booking.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

const hasResendEnv = Boolean(process.env["RESEND_API_KEY"]);

test.describe("booking inquiry", () => {
  test.skip(!hasResendEnv, "Requires RESEND_API_KEY — sends a real email to BAND_EMAIL");

  test("submits an inquiry and shows confirmation", async ({ page }) => {
    await page.goto("/booking");
    await page.getByLabel(/your name/i).fill("E2E Test");
    await page.getByLabel(/email/i).fill("e2e@example.com");
    await page.getByLabel(/event date/i).fill("Some Saturday in October");
    await page.getByLabel(/event type/i).fill("Backyard party");
    await page.getByLabel(/tell us about it/i).fill("Automated test inquiry — ignore me.");
    await page.getByRole("button", { name: /send inquiry/i }).click();
    await expect(page.getByText(/we’ll get back to you/i)).toBeVisible();
  });

  test("shows a validation error for a bad email", async ({ page }) => {
    await page.goto("/booking");
    await page.getByLabel(/email/i).fill("not-an-email");
    // Browser-level validation blocks submit; assert the field is flagged invalid.
    const emailInput = page.getByLabel(/email/i);
    await page.getByRole("button", { name: /send inquiry/i }).click();
    const invalid = await emailInput.evaluate((el) => !(el as HTMLInputElement).checkValidity());
    expect(invalid).toBe(true);
  });
});
```

- [ ] **Step 5: Run the suite locally**

With the prerequisites above (dev DB stocked, `stripe listen` running):

```bash
pnpm e2e
```

Expected: all tests pass (or skip cleanly when env is absent — verify by running once with `.env.local` renamed away). After the purchase test, confirm the loop closed:

```bash
psql "$DATABASE_URL" -c "SELECT stripe_session_id, status FROM orders ORDER BY created_at DESC LIMIT 1;"
psql "$DATABASE_URL" -c "SELECT * FROM inventory WHERE product_slug = 'logo-tee';"
```

Expected: one new order row; `L` stock decremented by 1; order notification email arrived at `BAND_EMAIL`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Add Playwright e2e tests for purchase and booking flows"
```

---

### Task 15: Launch checklist (manual)

No code — the ordered path from repo to live site. Check each box as completed; several steps happen in dashboards.

- [ ] **Step 1: GitHub + Vercel**
  1. Create the GitHub repo (`gh repo create pheve --private --source . --push`).
  2. Import the repo into Vercel; framework preset Next.js; production branch `main`.
  3. Confirm preview deploys build (no env vars needed for build — clients are lazy).

- [ ] **Step 2: Neon (production database)**
  1. Create a Neon project `pheve` (free tier); copy the **pooled** connection string.
  2. Locally: `DATABASE_URL=<prod pooled url> pnpm db:migrate` — expect the three tables created.
  3. Seed stock for real: `DATABASE_URL=<prod pooled url> pnpm restock logo-tee L 25` (repeat per variant with actual counts).

- [ ] **Step 3: Resend**
  1. Add and verify the `pheve.com` domain in Resend (SPF + DKIM DNS records).
  2. Create an Audience; note its id.
  3. Create an API key.

- [ ] **Step 4: Stripe**
  1. Enable Stripe Tax (origin address + US registrations as applicable) — first in test mode, later in live mode.
  2. Add a webhook endpoint for `https://pheve.com/api/webhooks/stripe` subscribing to `checkout.session.completed`; copy the signing secret. (Do this in test mode now; repeat in live mode at flip time.)

- [ ] **Step 5: Vercel env vars (production)**
  Set: `DATABASE_URL`, `STRIPE_SECRET_KEY` (test mode for now), `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `RESEND_AUDIENCE_ID`, `BAND_EMAIL`, `EMAIL_FROM`. Redeploy.

- [ ] **Step 6: Content pass**
  Replace placeholder events with real gigs, product placeholder images with photographed merch (`public/images/`), add real gallery photos/videos, set real prices and variants. Commit and merge via PR.

- [ ] **Step 7: Test-mode smoke test on production infrastructure**
  On the Vercel production URL (still test-mode Stripe): buy a tee with `4242…`, confirm success page, order email, stock decrement in Neon, and the order in the Stripe test dashboard.

- [ ] **Step 8: Go live**
  1. Swap `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` to live-mode values (live webhook endpoint from Step 4). Enable Stripe Tax in live mode. Redeploy.
  2. Point `pheve.com` DNS at Vercel; confirm the old one-pager is replaced.
  3. Real-money smoke test: buy the cheapest item with a real card, verify the full loop, then refund it in the Stripe dashboard.
  4. Announce the store at the next gig. 🤘

---

## Post-Plan Notes

- **Verification before completion:** after every task, all of `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test` must pass (plus `pnpm build` on UI tasks). Never claim a task done without running them.
- **Docs to consult when APIs surprise you** (use context7): Next.js App Router (ISR, route handlers, `params` promise), Stripe Checkout Sessions + webhooks, Drizzle ORM (pg driver, PGlite migrator), Resend Node SDK, Zod 4.
- **Known contingencies:** TypeScript 6 vs Next 16 (Task 1 Step 2); Stripe hosted-checkout selectors (Task 14 Step 3); `oxfmt --check` flag name (verify with `pnpm exec oxfmt --help` in Task 1).




