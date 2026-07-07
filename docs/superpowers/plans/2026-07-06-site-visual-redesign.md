# PHEVE Site Visual Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure every page to use full screen width with a loud rock/punk visual identity (near-black backgrounds, one poster-red accent, Anton condensed display type, skewed headlines, angled photo panels) plus a proper hamburger mobile nav — with zero changes to routes, content model, or dynamic behavior.

**Architecture:** A sequential foundation wave adds shared design tokens, the Anton font, reusable CSS component classes, and the new Nav/Footer/MobileNav chrome. Four independent page tracks (Home, Store, Shows+Gallery, Booking+Cart) then restyle their pages in parallel — each track touches a disjoint set of files and only *consumes* the shared foundation. A final integration wave merges the tracks and runs full verification.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind CSS 4 (`@theme` tokens in `globals.css`), `next/font/google` (Anton), TypeScript strict, Playwright, vitest, oxlint/oxfmt, pnpm.

**Spec:** `docs/superpowers/specs/2026-07-06-site-visual-redesign-design.md`

## Global Constraints

- **No new npm dependencies.** The only additions are one `next/font/google` import (Anton) and plain CSS.
- **No changes** to route handlers, API routes, database schema, `src/lib/` business logic (except the new `src/lib/dates.ts`), or content JSON shape.
- Accent color: poster red `#e0111a`, exposed as the Tailwind token `pheve-red` (hover shade `pheve-red-dark` `#b30d15`). Never hardcode the hex in components.
- Backgrounds: `#000` (`bg-black`) for full-bleed sections, `#111` (`bg-[#111]`) for cards/panels.
- Display type: Anton (weight 400 only) via CSS var `--font-anton` → Tailwind `font-display` utility. Body copy stays system sans.
- Headline skew is **−4deg at `md` and up only** — always via the shared `.headline-skew` class, never inline skew utilities (narrow widths must stay unskewed so type doesn't clip).
- **Sharp corners everywhere:** no `rounded-*` classes in redesigned UI.
- Width system: full-bleed chrome spans 100vw; content sits in the shared `.shell` class (`max-w-[90rem]`, responsive padding). Reading-width content (forms, descriptions) capped `max-w-xl`–`max-w-2xl` *inside* the shell.
- Grids are mobile-first and **never 1 column at the smallest breakpoint** (Store/Gallery: 2→3→4→5; Shows: 1 col is allowed only below `md` per spec — Shows goes 1→2→3).
- Primary buttons: shared `.btn-primary` (solid red, uppercase, white). Secondary: `.btn-ghost` (red outline). Form inputs: `.input-field`.
- tsconfig strictness is already maxed (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, …) — index reads like `images[i]` need `?? fallback`.
- Zero warnings: `pnpm lint && pnpm typecheck && pnpm format:check` must be clean before every commit. Format with `pnpm format`.
- Commits: imperative mood, ≤72-char subject, one logical change each. Never push to main — all work lands on `feature/site-visual-redesign` via PR.
- Out of scope: content model changes, CMS/admin, checkout flow changes, new pages, song list page.

## Parallel Execution Strategy (up to 4 agents)

```
Wave 0 (sequential, 1 agent, on feature/site-visual-redesign)
  Task 1  Design tokens, Anton font, shared CSS classes, PageHeading, date helper
  Task 2  Nav / Footer / MobileNav chrome + nav e2e test
        │  ← Wave 0 MUST be merged into feature/site-visual-redesign
        │    before any Wave 1 agent starts
        ▼
Wave 1 (up to 4 agents in parallel, each branched off feature/site-visual-redesign)
  Track A  redesign/track-a-home      Tasks 3–4   Home hero, stat strip, mailing list
  Track B  redesign/track-b-store     Tasks 5–8   Store grid, ProductGallery, detail page,
                                                  swatch size picker, success page, purchase e2e
  Track C  redesign/track-c-media     Tasks 9–10  Shows grid, Gallery grids
  Track D  redesign/track-d-forms     Tasks 11–12 Booking split, Cart split, booking e2e
        │  ← all four branches merge back into feature/site-visual-redesign
        ▼
Wave 2 (sequential, 1 agent)
  Task 13 Integration: merge tracks, full verification, breakpoint screenshot sweep
```

**Hard rules for Wave 1 agents:**

1. **One git worktree per agent** (`superpowers:using-git-worktrees`). Never share a working directory.
2. Branch off `feature/site-visual-redesign` *after* Wave 0 is merged.
3. **Never modify shared/foundation files:** `src/app/globals.css`, `src/app/layout.tsx`, `src/components/mobile-nav.tsx`, `src/components/page-heading.tsx`, `src/lib/dates.ts`, or any file owned by another track (ownership table below). If a track thinks it needs a new shared utility, it defines a local class in its own file or stops and reports — it does not edit `globals.css`.
4. Each track runs `pnpm lint && pnpm typecheck && pnpm test && pnpm build` before its final commit.

**File ownership (conflict-free by construction):**

| Owner | Files |
|---|---|
| Wave 0 | `src/app/globals.css`, `src/app/layout.tsx`, `src/components/mobile-nav.tsx`, `src/components/page-heading.tsx`, `src/lib/dates.ts`, `src/lib/dates.test.ts`, `e2e/nav.spec.ts` |
| Track A | `src/app/page.tsx`, `src/components/mailing-list-form.tsx`, `e2e/home.spec.ts` |
| Track B | `src/app/store/page.tsx`, `src/app/store/[slug]/page.tsx`, `src/app/store/success/page.tsx`, `src/components/add-to-cart.tsx`, `src/components/product-gallery.tsx`, `src/components/sold-out-stamp.tsx`, `e2e/purchase.spec.ts`, `e2e/store.spec.ts` |
| Track C | `src/app/shows/page.tsx`, `src/app/gallery/page.tsx` |
| Track D | `src/app/booking/page.tsx`, `src/components/booking-form.tsx`, `src/app/cart/page.tsx`, `src/components/cart-view.tsx`, `e2e/booking.spec.ts` |
| Wave 2 | merge commits only |

Untouched (do not edit): `src/components/cart-provider.tsx`, `src/components/cart-link.tsx`, everything under `src/app/api/`, `src/lib/` (except `dates.ts`), `content/`, `drizzle/`, `scripts/`.

---

## Wave 0 — Foundation (sequential)

### Task 1: Design tokens, Anton font, shared CSS, PageHeading, date helper

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx` (font wiring only — Nav/Footer change in Task 2)
- Create: `src/components/page-heading.tsx`
- Create: `src/lib/dates.ts`
- Test: `src/lib/dates.test.ts`

**Interfaces:**
- Produces CSS classes every later task uses: `.shell`, `.eyebrow`, `.headline-skew`, `.stripe-texture`, `.clip-angled`, `.btn-primary`, `.btn-ghost`, `.input-field`.
- Produces Tailwind tokens: `pheve-red`, `pheve-red-dark` (usable as `bg-pheve-red`, `text-pheve-red`, `border-pheve-red`, …) and the `font-display` font utility.
- Produces `PageHeading({ eyebrow, title }: { eyebrow: string; title: string })` — server component rendering eyebrow + skewed `<h1>`.
- Produces `formatEventDate(date: string): string` — `"2026-10-10"` → `"Sat, October 10, 2026"`.

- [ ] **Step 1: Write the failing test for the date helper**

Create `src/lib/dates.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { formatEventDate } from "@/lib/dates";

describe("formatEventDate", () => {
  it("formats YYYY-MM-DD as a long weekday date", () => {
    expect(formatEventDate("2026-10-10")).toBe("Sat, October 10, 2026");
  });

  it("does not shift the day across timezones (noon anchor)", () => {
    expect(formatEventDate("2026-01-01")).toBe("Thu, January 1, 2026");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test src/lib/dates.test.ts`
Expected: FAIL — cannot resolve `@/lib/dates`.

- [ ] **Step 3: Implement the date helper**

Create `src/lib/dates.ts` (this is the same logic currently inlined in `src/app/shows/page.tsx:8-15`; Track C will delete that copy):

```ts
export function formatEventDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test src/lib/dates.test.ts`
Expected: 2 passed.

- [ ] **Step 5: Replace `src/app/globals.css` with tokens + shared classes**

Full new contents of `src/app/globals.css`:

```css
@import "tailwindcss";

@theme {
  --color-pheve-red: #e0111a;
  --color-pheve-red-dark: #b30d15;
  --font-display: var(--font-anton);
}

@layer components {
  /* Content shell: wide inner container. Full-bleed chrome sits OUTSIDE this. */
  .shell {
    width: 100%;
    max-width: 90rem;
    margin-inline: auto;
    padding-inline: 1.5rem;
  }
  @media (min-width: 768px) {
    .shell {
      padding-inline: 3rem;
    }
  }
  @media (min-width: 1024px) {
    .shell {
      padding-inline: 4rem;
    }
  }

  /* Small uppercase red section label */
  .eyebrow {
    color: var(--color-pheve-red);
    font-size: 0.875rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.3em;
  }

  /* Signature headline skew — desktop only so narrow type doesn't clip */
  .headline-skew {
    display: inline-block;
  }
  @media (min-width: 768px) {
    .headline-skew {
      transform: skewX(-4deg);
    }
  }

  /* Low-opacity diagonal stripes behind dark hero sections */
  .stripe-texture {
    position: relative;
    isolation: isolate;
  }
  .stripe-texture::before {
    content: "";
    position: absolute;
    inset: 0;
    z-index: -1;
    pointer-events: none;
    background: repeating-linear-gradient(
      -45deg,
      rgb(255 255 255 / 0.04) 0,
      rgb(255 255 255 / 0.04) 1px,
      transparent 1px,
      transparent 12px
    );
  }

  /* Angled photo panel: slanted left edge on desktop, shallow bottom cut on mobile */
  .clip-angled {
    clip-path: polygon(0 0, 100% 0, 100% 92%, 0 100%);
  }
  @media (min-width: 768px) {
    .clip-angled {
      clip-path: polygon(0 0, 100% 0, 100% 100%, 6% 100%);
    }
  }

  .btn-primary {
    display: inline-block;
    padding: 0.75rem 1.5rem;
    background-color: var(--color-pheve-red);
    color: #fff;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    text-align: center;
    transition: background-color 150ms;
  }
  .btn-primary:hover {
    background-color: var(--color-pheve-red-dark);
  }
  .btn-primary:disabled {
    cursor: not-allowed;
    opacity: 0.4;
  }

  .btn-ghost {
    display: inline-block;
    padding: 0.75rem 1.5rem;
    border: 2px solid var(--color-pheve-red);
    color: #fff;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    text-align: center;
    transition: background-color 150ms;
  }
  .btn-ghost:hover {
    background-color: var(--color-pheve-red);
  }

  .input-field {
    width: 100%;
    padding: 0.5rem 0.75rem;
    border: 1px solid #3f3f46; /* zinc-700 */
    background-color: #111;
  }
  .input-field:focus {
    border-color: var(--color-pheve-red);
    outline: none;
  }
}
```

- [ ] **Step 6: Wire the Anton font into the layout**

In `src/app/layout.tsx`, add the import and font constant, and put the variable class on `<html>`. Only these lines change in this task:

```tsx
import type { Metadata } from "next";
import { Anton } from "next/font/google";
import Link from "next/link";
import type { ReactNode } from "react";
import { CartLink } from "@/components/cart-link";
import { CartProvider } from "@/components/cart-provider";
import "./globals.css";

const anton = Anton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-anton",
});
```

and

```tsx
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={anton.variable}>
      <body className="min-h-screen bg-black text-zinc-100 antialiased">
        <CartProvider>
          <Nav />
          {children}
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 7: Create the PageHeading component**

Create `src/components/page-heading.tsx`:

```tsx
export function PageHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <header>
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="headline-skew mt-2 font-display text-5xl uppercase tracking-wide md:text-6xl">
        {title}
      </h1>
    </header>
  );
}
```

- [ ] **Step 8: Verify build, lint, types, format**

Run: `pnpm lint && pnpm typecheck && pnpm format && pnpm build`
Expected: all clean; build succeeds (Anton is downloaded and self-hosted at build time — network is needed on first build).

- [ ] **Step 9: Commit**

```bash
git add src/app/globals.css src/app/layout.tsx src/components/page-heading.tsx src/lib/dates.ts src/lib/dates.test.ts
git commit -m "Add redesign tokens, Anton display font, shared CSS classes"
```

### Task 2: Nav, Footer, MobileNav

**Files:**
- Create: `src/components/mobile-nav.tsx`
- Modify: `src/app/layout.tsx` (the `Nav` and `Footer` functions)
- Test: `e2e/nav.spec.ts`

**Interfaces:**
- Consumes: `.shell`, `.eyebrow` variants, `pheve-red` token, `font-display` (Task 1); existing `CartLink` from `@/components/cart-link` (unchanged).
- Produces: `MobileNav({ links }: { links: { href: string; label: string }[] })` — client component; renders a hamburger `<button aria-label="Open menu">` and, when open, a `<div id="mobile-menu">` dropdown. Nothing else depends on it, but e2e tests target `#mobile-menu` and the button's accessible name.

- [ ] **Step 1: Write the failing e2e test**

Create `e2e/nav.spec.ts` (needs no env vars or database):

```ts
import { expect, test } from "@playwright/test";

test.describe("mobile nav", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("hamburger opens the menu and navigates", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#mobile-menu")).toHaveCount(0);
    await page.getByRole("button", { name: /open menu/i }).click();
    await page.locator("#mobile-menu").getByRole("link", { name: "Shows" }).click();
    await expect(page).toHaveURL(/\/shows$/);
  });
});

test.describe("desktop nav", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("shows inline links and no hamburger", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: /open menu/i })).toBeHidden();
    await expect(page.getByRole("navigation").getByRole("link", { name: "Store" })).toBeVisible();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm e2e e2e/nav.spec.ts`
(If browsers are missing: `pnpm exec playwright install chromium` first. The Playwright config auto-starts `pnpm dev`.)
Expected: mobile test FAILS — no button named "Open menu" exists yet. Desktop test may pass vacuously; that's fine.

- [ ] **Step 3: Create the MobileNav component**

Create `src/components/mobile-nav.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useState } from "react";

export function MobileNav({ links }: { links: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? "Close menu" : "Open menu"}
        className="flex h-11 w-11 flex-col items-center justify-center gap-1.5"
        onClick={() => setOpen(!open)}
      >
        <span
          className={`h-0.5 w-6 bg-white transition-transform ${open ? "translate-y-2 rotate-45" : ""}`}
        />
        <span className={`h-0.5 w-6 bg-white ${open ? "opacity-0" : ""}`} />
        <span
          className={`h-0.5 w-6 bg-white transition-transform ${open ? "-translate-y-2 -rotate-45" : ""}`}
        />
      </button>
      {open ? (
        <div
          id="mobile-menu"
          className="absolute inset-x-0 top-full z-50 border-b-2 border-pheve-red bg-black"
        >
          <nav className="shell flex flex-col py-4">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="py-3 text-lg font-bold uppercase tracking-wider hover:text-pheve-red"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 4: Rewrite Nav and Footer in the layout**

Replace the `Nav` and `Footer` functions in `src/app/layout.tsx` and add the `MobileNav` import. Full final file:

```tsx
import type { Metadata } from "next";
import { Anton } from "next/font/google";
import Link from "next/link";
import type { ReactNode } from "react";
import { CartLink } from "@/components/cart-link";
import { CartProvider } from "@/components/cart-provider";
import { MobileNav } from "@/components/mobile-nav";
import "./globals.css";

const anton = Anton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-anton",
});

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
    <header className="relative border-b-2 border-pheve-red bg-black">
      <nav className="shell flex items-center justify-between py-4">
        <Link href="/" className="font-display text-2xl uppercase tracking-widest">
          PHEVE
        </Link>
        <div className="hidden items-center gap-6 text-sm font-bold uppercase tracking-wider text-zinc-300 md:flex">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-pheve-red">
              {link.label}
            </Link>
          ))}
          <CartLink />
        </div>
        <div className="flex items-center gap-4 text-sm font-bold uppercase tracking-wider md:hidden">
          <CartLink />
          <MobileNav links={NAV_LINKS} />
        </div>
      </nav>
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-24 border-t-2 border-pheve-red bg-black py-12 text-sm text-zinc-500">
      <div className="shell flex flex-col items-center gap-6">
        <div className="flex flex-wrap justify-center gap-8">
          {SOCIAL_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="font-bold uppercase tracking-wider hover:text-pheve-red"
            >
              {link.label}
            </a>
          ))}
        </div>
        <p>© {new Date().getFullYear()} PHEVE</p>
      </div>
    </footer>
  );
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={anton.variable}>
      <body className="min-h-screen bg-black text-zinc-100 antialiased">
        <CartProvider>
          <Nav />
          {children}
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}
```

Note: `CartLink` renders in both the desktop group (CSS-hidden below `md`) and the mobile group (CSS-hidden at `md`+), so the cart stays reachable on mobile without opening the hamburger.

- [ ] **Step 5: Run the e2e test to verify it passes**

Run: `pnpm e2e e2e/nav.spec.ts`
Expected: 2 passed.

- [ ] **Step 6: Verify lint, types, format**

Run: `pnpm lint && pnpm typecheck && pnpm format`
Expected: clean.

- [ ] **Step 7: Commit, then merge Wave 0 into the feature branch**

```bash
git add src/app/layout.tsx src/components/mobile-nav.tsx e2e/nav.spec.ts
git commit -m "Add full-bleed nav with hamburger MobileNav and dark footer"
```

Wave 0 work happens directly on `feature/site-visual-redesign` (create it from `main` before Task 1 if it doesn't exist). Both commits must be on that branch before any Wave 1 agent branches off.

---

## Wave 1 — Track A: Home (Tasks 3–4)

Branch: `redesign/track-a-home` off `feature/site-visual-redesign`, own worktree.
Owns: `src/app/page.tsx`, `src/components/mailing-list-form.tsx`, `e2e/home.spec.ts`. Touch nothing else.

### Task 3: Home hero + stat strip

**Files:**
- Modify: `src/app/page.tsx` (full rewrite)
- Test: `e2e/home.spec.ts`

**Interfaces:**
- Consumes: `.shell`, `.eyebrow`, `.headline-skew`, `.stripe-texture`, `.clip-angled`, `.btn-primary`, `.btn-ghost`, `font-display`, `pheve-red` (Task 1); `formatEventDate(date: string): string` from `@/lib/dates` (Task 1); existing `loadEvents`/`upcomingEvents` from `@/lib/content` and `MailingListForm` (restyled in Task 4 — same import, same props).
- Produces: nothing consumed by other tasks.

- [ ] **Step 1: Write the failing e2e test**

Create `e2e/home.spec.ts` (no env/DB needed):

```ts
import { expect, test } from "@playwright/test";

test("home shows the hero headline and stat strip links", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /played loud/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /see shows/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /hit the store/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /instagram/i }).first()).toBeVisible();
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm e2e e2e/home.spec.ts`
Expected: FAIL — no heading matches `/played loud/i` (current hero is the logo image), no "See shows" link.

- [ ] **Step 3: Rewrite the home page**

Full new contents of `src/app/page.tsx`:

```tsx
import Image from "next/image";
import Link from "next/link";
import { MailingListForm } from "@/components/mailing-list-form";
import { loadEvents, upcomingEvents } from "@/lib/content";
import { formatEventDate } from "@/lib/dates";

export const revalidate = 3600;

export default function HomePage() {
  const nextShow = upcomingEvents(loadEvents(), new Date())[0];

  return (
    <main>
      <section className="stripe-texture bg-black">
        <div className="shell grid items-center gap-10 py-16 md:grid-cols-2 md:py-28">
          <div className="clip-angled relative h-64 bg-[#111] md:order-2 md:h-96">
            <Image
              src="/images/pheve-logo.png"
              alt="PHEVE"
              fill
              priority
              className="object-contain p-8"
              sizes="(max-width: 768px) 100vw, 45vw"
            />
          </div>
          <div>
            <p className="eyebrow">Live cover band</p>
            <h1 className="headline-skew mt-3 font-display text-6xl uppercase leading-none md:text-8xl">
              The songs you know, played loud.
            </h1>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/shows" className="btn-primary">
                See shows
              </Link>
              <Link href="/booking" className="btn-ghost">
                Book the band
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y-2 border-pheve-red bg-[#111]">
        <div className="grid divide-y divide-zinc-800 md:grid-cols-3 md:divide-x md:divide-y-0">
          <div className="px-6 py-8 md:px-12">
            <p className="eyebrow">Next show</p>
            {nextShow ? (
              <>
                <p className="mt-2 font-display text-3xl uppercase">{nextShow.venue}</p>
                <p className="mt-1 text-zinc-400">
                  {nextShow.city} · {formatEventDate(nextShow.date)} · {nextShow.time}
                </p>
                <Link
                  href="/shows"
                  className="mt-3 inline-block text-sm font-bold uppercase tracking-wider text-pheve-red hover:text-white"
                >
                  All shows →
                </Link>
              </>
            ) : (
              <p className="mt-2 text-zinc-400">
                Nothing booked — follow us and you’ll be the first to know.
              </p>
            )}
          </div>
          <div className="px-6 py-8 md:px-12">
            <p className="eyebrow">Latest merch</p>
            <p className="mt-2 font-display text-3xl uppercase">Tees, hats &amp; stickers</p>
            <Link
              href="/store"
              className="mt-3 inline-block text-sm font-bold uppercase tracking-wider text-pheve-red hover:text-white"
            >
              Hit the store →
            </Link>
          </div>
          <div className="px-6 py-8 md:px-12">
            <p className="eyebrow">Follow</p>
            <div className="mt-2 flex flex-col gap-2 text-sm font-bold uppercase tracking-wider">
              <a href="https://www.facebook.com/PHEVEband" className="hover:text-pheve-red">
                Facebook
              </a>
              <a href="https://www.instagram.com/pheveband/" className="hover:text-pheve-red">
                Instagram
              </a>
              <a href="https://venmo.com/pheve" className="hover:text-pheve-red">
                Venmo tips
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="shell py-16 md:py-24">
        <div className="mx-auto max-w-xl text-center">
          <p className="eyebrow">Mailing list</p>
          <h2 className="headline-skew mt-2 font-display text-4xl uppercase">Never miss a show</h2>
          <MailingListForm />
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 4: Run the e2e test to verify it passes**

Run: `pnpm e2e e2e/home.spec.ts`
Expected: 1 passed. (The nav footer also has an Instagram link — that's why the test uses `.first()`.)

- [ ] **Step 5: Verify lint, types, format; commit**

Run: `pnpm lint && pnpm typecheck && pnpm format`

```bash
git add src/app/page.tsx e2e/home.spec.ts
git commit -m "Replace centered home hero with full-bleed hero and stat strip"
```

### Task 4: Mailing list form restyle

**Files:**
- Modify: `src/components/mailing-list-form.tsx`

**Interfaces:**
- Consumes: `.input-field`, `.btn-primary` (Task 1).
- Produces: same component signature `MailingListForm()` — logic, endpoint, and states unchanged; classes only.

- [ ] **Step 1: Restyle the form**

Full new contents of `src/components/mailing-list-form.tsx` (only `className` values change from the current file):

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
    return <p className="mt-8 text-green-300">You’re on the list. See you up front. 🤘</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-2 sm:flex-row">
      <label className="sr-only" htmlFor="mailing-list-email">
        Email address
      </label>
      <input
        id="mailing-list-email"
        name="email"
        type="email"
        required
        placeholder="you@example.com"
        className="input-field"
      />
      <button type="submit" disabled={status === "sending"} className="btn-primary whitespace-nowrap">
        Get show alerts
      </button>
      {status === "error" ? <p className="text-sm text-red-400">Try again?</p> : null}
    </form>
  );
}
```

- [ ] **Step 2: Verify — home e2e still passes, lint, types**

Run: `pnpm e2e e2e/home.spec.ts && pnpm lint && pnpm typecheck && pnpm format && pnpm test && pnpm build`
Expected: all clean (this is the track's final gate).

- [ ] **Step 3: Commit**

```bash
git add src/components/mailing-list-form.tsx
git commit -m "Restyle mailing list form with shared input and button classes"
```

---

## Wave 1 — Track B: Store (Tasks 5–8)

Branch: `redesign/track-b-store` off `feature/site-visual-redesign`, own worktree.
Owns: `src/app/store/page.tsx`, `src/app/store/[slug]/page.tsx`, `src/app/store/success/page.tsx`, `src/components/add-to-cart.tsx`, `src/components/product-gallery.tsx`, `src/components/sold-out-stamp.tsx`, `e2e/purchase.spec.ts`, `e2e/store.spec.ts`. Touch nothing else.

Some store e2e assertions need seeded stock: run `pnpm db:setup` once in the worktree (starts Docker Postgres, migrates, seeds). Tests are written to skip gracefully if the DB is down.

### Task 5: Store grid + SoldOutStamp

**Files:**
- Create: `src/components/sold-out-stamp.tsx`
- Modify: `src/app/store/page.tsx` (full rewrite)
- Test: `e2e/store.spec.ts` (grid test; more tests added in Task 7)

**Interfaces:**
- Consumes: `.shell`, `pheve-red`, `font-display`, `PageHeading` from `@/components/page-heading` (Task 1).
- Produces: `SoldOutStamp({ className }: { className?: string })` — rotated red stamp `<span>`; defaults to absolute top-right positioning for use inside a `relative` card; Task 7 passes `className="inline-block"` on the detail page.

- [ ] **Step 1: Write the failing e2e test**

Create `e2e/store.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test.describe("store grid", () => {
  test("renders product cards with the page heading", async ({ page }) => {
    await page.goto("/store");
    await expect(page.getByRole("heading", { name: /merch/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /PHEVE Logo Tee/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Sticker Pack/i })).toBeVisible();
  });
});
```

- [ ] **Step 2: Run it to verify current behavior**

Run: `pnpm e2e e2e/store.spec.ts`
Expected: FAIL — current page has heading "Merch" as plain h1 without the eyebrow… actually `getByRole("heading", { name: /merch/i })` matches the existing h1 too, so this test may PASS against the old page. That's acceptable: it pins behavior that must survive the redesign. Note the result and continue.

- [ ] **Step 3: Create SoldOutStamp**

Create `src/components/sold-out-stamp.tsx`:

```tsx
export function SoldOutStamp({ className = "absolute right-2 top-3" }: { className?: string }) {
  return (
    <span
      className={`pointer-events-none -rotate-12 border-2 border-pheve-red bg-black/70 px-2 py-0.5 text-xs font-black uppercase tracking-widest text-pheve-red ${className}`}
    >
      Sold out
    </span>
  );
}
```

- [ ] **Step 4: Rewrite the store grid**

Full new contents of `src/app/store/page.tsx`:

```tsx
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PageHeading } from "@/components/page-heading";
import { SoldOutStamp } from "@/components/sold-out-stamp";
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
    <main className="shell py-12 md:py-16">
      <PageHeading eyebrow="The merch table" title="Merch" />
      {stock === null ? (
        <p className="mt-6 border border-yellow-900 bg-yellow-950/40 p-4 text-yellow-200">
          The store is napping — browsing only for now. Check back soon.
        </p>
      ) : null}
      <ul className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4 2xl:grid-cols-5">
        {products.map((product) => {
          const variants = stock?.[product.slug] ?? {};
          const soldOut = stock !== null && product.variants.every((v) => (variants[v] ?? 0) === 0);
          return (
            <li key={product.slug}>
              <Link
                href={`/store/${product.slug}`}
                className="relative block border border-zinc-800 bg-[#111] p-4 transition-colors hover:border-pheve-red"
              >
                <div className="relative h-40 w-full">
                  <Image
                    src={product.images[0] ?? "/images/pheve-logo.png"}
                    alt={product.name}
                    fill
                    className="object-contain"
                    sizes="(max-width: 768px) 50vw, (max-width: 1536px) 25vw, 20vw"
                  />
                </div>
                <p className="mt-3 font-semibold">{product.name}</p>
                <p className="text-zinc-400">{formatCents(product.priceCents)}</p>
                {soldOut ? <SoldOutStamp /> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
```

- [ ] **Step 5: Run the e2e test to verify it passes**

Run: `pnpm e2e e2e/store.spec.ts`
Expected: 1 passed.

- [ ] **Step 6: Verify lint, types, format; commit**

Run: `pnpm lint && pnpm typecheck && pnpm format`

```bash
git add src/components/sold-out-stamp.tsx src/app/store/page.tsx e2e/store.spec.ts
git commit -m "Widen store grid to 2-5 columns with rotated sold-out stamps"
```

### Task 6: ProductGallery component

**Files:**
- Create: `src/components/product-gallery.tsx`

**Interfaces:**
- Consumes: `.clip-angled`, `pheve-red` (Task 1).
- Produces: `ProductGallery({ images, name }: { images: string[]; name: string })` — client component; renders the main product image in an angled panel plus a clickable thumbnail strip when `images.length > 1`. Task 7's page renders it with `product.images`. (Current products each have one image, so the strip stays hidden until real photos land — that's expected per the spec's out-of-scope note.)

- [ ] **Step 1: Create the component**

Create `src/components/product-gallery.tsx`:

```tsx
"use client";

import Image from "next/image";
import { useState } from "react";

export function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const [selected, setSelected] = useState(0);
  const mainImage = images[selected] ?? images[0] ?? "/images/pheve-logo.png";

  return (
    <div>
      <div className="clip-angled relative h-80 w-full bg-[#111] md:h-[28rem]">
        <Image
          src={mainImage}
          alt={name}
          fill
          priority
          className="object-contain p-6"
          sizes="(max-width: 1024px) 100vw, 50vw"
        />
      </div>
      {images.length > 1 ? (
        <ul className="mt-4 flex flex-wrap gap-3">
          {images.map((src, i) => (
            <li key={src}>
              <button
                type="button"
                aria-label={`View image ${i + 1} of ${name}`}
                aria-current={i === selected}
                onClick={() => setSelected(i)}
                className={`relative block h-16 w-16 border ${
                  i === selected ? "border-pheve-red" : "border-zinc-700 hover:border-zinc-400"
                }`}
              >
                <Image src={src} alt="" fill className="object-contain p-1" sizes="64px" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles clean; commit**

Run: `pnpm lint && pnpm typecheck && pnpm format`
Expected: clean. (The component is exercised end-to-end in Task 7's test once the detail page renders it; the thumbnail-swap branch can't be e2e-tested until a product has ≥2 images, and adding fake content is out of scope.)

```bash
git add src/components/product-gallery.tsx
git commit -m "Add ProductGallery with angled main image and thumbnail strip"
```

### Task 7: Product detail split layout + swatch size picker

**Files:**
- Modify: `src/app/store/[slug]/page.tsx` (full rewrite)
- Modify: `src/components/add-to-cart.tsx` (full rewrite — `<select>` → radiogroup swatches)
- Modify: `e2e/purchase.spec.ts:11` (selectOption → radio click)
- Test: `e2e/store.spec.ts` (append swatch tests)

**Interfaces:**
- Consumes: `ProductGallery` (Task 6), `SoldOutStamp` (Task 5), `.shell`, `.eyebrow`, `.headline-skew`, `.btn-primary`, `font-display` (Task 1); existing `useCart`, `getProduct`, `getStockMap`, `formatCents` (unchanged).
- Produces: `AddToCart({ product, stock }: { product: Product; stock: Record<string, number> })` — same signature as today; swatches expose `role="radio"` with the variant text as accessible name (this is what `e2e/purchase.spec.ts` targets).

- [ ] **Step 1: Append the failing swatch tests to `e2e/store.spec.ts`**

Add below the existing describe block:

```ts
test.describe("product detail", () => {
  test("size swatches select a variant and add to cart", async ({ page }) => {
    await page.goto("/store/logo-tee");
    test.skip(
      await page.getByText(/store is napping/i).isVisible(),
      "Requires local Postgres with seeded stock — run pnpm db:setup",
    );
    await page.getByRole("radio", { name: "L" }).click();
    await expect(page.getByRole("radio", { name: "L" })).toHaveAttribute("aria-checked", "true");
    await expect(page.getByRole("radio", { name: "S" })).toHaveAttribute("aria-checked", "false");
    await page.getByRole("button", { name: /add to cart/i }).click();
    // CartLink renders in both the desktop and mobile nav groups; only one is visible.
    await expect(page.getByRole("link", { name: /cart \(1\)/i }).first()).toBeVisible();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm db:setup` (if not already running), then `pnpm e2e e2e/store.spec.ts`
Expected: the new test FAILS — no `role="radio"` exists (current UI is a `<select>`).

- [ ] **Step 3: Rewrite AddToCart with swatch buttons**

Full new contents of `src/components/add-to-cart.tsx`:

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
    <div className="mt-8">
      {product.variants.length > 1 ? (
        <fieldset>
          <legend className="eyebrow text-xs">Size</legend>
          <div role="radiogroup" aria-label="Size" className="mt-3 flex flex-wrap gap-2">
            {product.variants.map((v) => {
              const out = (stock[v] ?? 0) === 0;
              const selected = v === variant;
              return (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={out}
                  onClick={() => setVariant(v)}
                  className={`min-h-11 min-w-11 border-2 px-3 py-2 font-bold uppercase ${
                    selected
                      ? "border-pheve-red bg-pheve-red text-white"
                      : "border-zinc-700 text-zinc-200 hover:border-zinc-400"
                  } disabled:cursor-not-allowed disabled:opacity-30 disabled:line-through`}
                >
                  {v}
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : null}
      <button type="button" disabled={!available} onClick={handleAdd} className="btn-primary mt-6">
        {available ? (added ? "Added ✓" : "Add to cart") : "Sold out"}
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Rewrite the product detail page as a split layout**

Full new contents of `src/app/store/[slug]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { AddToCart } from "@/components/add-to-cart";
import { ProductGallery } from "@/components/product-gallery";
import { SoldOutStamp } from "@/components/sold-out-stamp";
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

  const allSoldOut = stock !== null && product.variants.every((v) => (stock[v] ?? 0) === 0);

  return (
    <main className="shell py-12 md:py-16">
      <div className="grid gap-10 lg:grid-cols-2">
        <ProductGallery images={product.images} name={product.name} />
        <div className="lg:sticky lg:top-8 lg:self-start">
          <p className="eyebrow">Merch</p>
          <h1 className="headline-skew mt-2 font-display text-4xl uppercase md:text-5xl">
            {product.name}
          </h1>
          <p className="mt-3 text-2xl text-zinc-300">{formatCents(product.priceCents)}</p>
          {allSoldOut ? <SoldOutStamp className="mt-4 inline-block" /> : null}
          <p className="mt-4 max-w-xl text-zinc-400">{product.description}</p>
          {stock === null ? (
            <p className="mt-6 border border-yellow-900 bg-yellow-950/40 p-4 text-yellow-200">
              The store is napping — you can’t buy right now. Check back soon.
            </p>
          ) : (
            <AddToCart product={product} stock={stock} />
          )}
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 5: Update the purchase e2e spec**

In `e2e/purchase.spec.ts`, replace line 11:

```ts
    await page.getByLabel(/size/i).selectOption("L");
```

with:

```ts
    await page.getByRole("radio", { name: "L" }).click();
```

(Playwright matches `getByRole` names as whole strings case-insensitively, so `"L"` does not match `"XL"` or `"2XL"`.)

- [ ] **Step 6: Run the store e2e to verify it passes**

Run: `pnpm e2e e2e/store.spec.ts`
Expected: 2 passed (grid + swatches). If Stripe test env is configured, also run `pnpm e2e e2e/purchase.spec.ts` — expected: 1 passed; otherwise it self-skips.

- [ ] **Step 7: Verify lint, types, format; commit**

Run: `pnpm lint && pnpm typecheck && pnpm format`

```bash
git add src/app/store/[slug]/page.tsx src/components/add-to-cart.tsx e2e/purchase.spec.ts e2e/store.spec.ts
git commit -m "Split product detail layout and replace size select with swatches"
```

### Task 8: Success page restyle

**Files:**
- Modify: `src/app/store/success/page.tsx`

**Interfaces:**
- Consumes: `.shell`, `.headline-skew`, `.btn-ghost`, `font-display` (Task 1); existing `useCart` (unchanged).
- Produces: nothing consumed elsewhere. The purchase e2e asserts `getByText(/order in/i)` — the headline text must keep saying "Order in".

- [ ] **Step 1: Restyle the page**

Full new contents of `src/app/store/success/page.tsx` (logic — the cart-clearing effect — unchanged):

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
    <main className="shell py-24 text-center">
      <h1 className="headline-skew font-display text-5xl uppercase md:text-6xl">
        Order in. You rule. 🤘
      </h1>
      <p className="mt-4 text-zinc-400">
        Stripe is emailing your receipt. We pack orders between gigs — it’ll ship soon.
      </p>
      <Link href="/" className="btn-ghost mt-10">
        Back to the band
      </Link>
    </main>
  );
}
```

- [ ] **Step 2: Final track gate; commit**

Run: `pnpm lint && pnpm typecheck && pnpm format && pnpm test && pnpm build && pnpm e2e e2e/store.spec.ts`
Expected: all clean.

```bash
git add src/app/store/success/page.tsx
git commit -m "Restyle checkout success page with display type"
```

---

## Wave 1 — Track C: Shows + Gallery (Tasks 9–10)

Branch: `redesign/track-c-media` off `feature/site-visual-redesign`, own worktree.
Owns: `src/app/shows/page.tsx`, `src/app/gallery/page.tsx`. Touch nothing else.

### Task 9: Shows grid

**Files:**
- Modify: `src/app/shows/page.tsx` (full rewrite)

**Interfaces:**
- Consumes: `.shell`, `.eyebrow`, `pheve-red`, `font-display`, `PageHeading` (Task 1); `formatEventDate` from `@/lib/dates` (Task 1 — replaces the local `formatDate`, which must be deleted); existing `loadEvents`/`upcomingEvents`/`BandEvent` (unchanged).
- Produces: nothing consumed elsewhere.

- [ ] **Step 1: Rewrite the shows page**

Full new contents of `src/app/shows/page.tsx` (the local `formatDate` helper is deleted in favor of `formatEventDate`):

```tsx
import type { Metadata } from "next";
import { PageHeading } from "@/components/page-heading";
import { loadEvents, upcomingEvents, type BandEvent } from "@/lib/content";
import { formatEventDate } from "@/lib/dates";

export const revalidate = 3600;

export const metadata: Metadata = { title: "Shows — PHEVE" };

function EventCard({ event }: { event: BandEvent }) {
  return (
    <li className="border border-zinc-800 bg-[#111] p-6">
      <p className="eyebrow text-xs">{formatEventDate(event.date)}</p>
      <p className="mt-2 font-display text-2xl uppercase">{event.venue}</p>
      <p className="mt-1 text-zinc-400">
        {event.city} · {event.time}
      </p>
      {event.link ? (
        <a
          href={event.link}
          className="mt-3 inline-block text-sm font-bold uppercase tracking-wider text-pheve-red hover:text-white"
        >
          Venue info →
        </a>
      ) : null}
    </li>
  );
}

export default function ShowsPage() {
  const events = upcomingEvents(loadEvents(), new Date());

  return (
    <main className="shell py-12 md:py-16">
      <PageHeading eyebrow="On the calendar" title="Upcoming shows" />
      {events.length === 0 ? (
        <p className="mt-8 text-zinc-500">
          Nothing on the calendar right now. Follow us on socials — new dates land there first.
        </p>
      ) : (
        <ul className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <EventCard key={`${event.date}-${event.venue}`} event={event} />
          ))}
        </ul>
      )}
    </main>
  );
}
```

- [ ] **Step 2: Verify lint, types, format; check the page renders**

Run: `pnpm lint && pnpm typecheck && pnpm format`
Then: `pnpm dev` in the background and `curl -s http://localhost:3000/shows | grep -c "Upcoming shows"`
Expected: lint/types clean; grep prints ≥1.

- [ ] **Step 3: Commit**

```bash
git add src/app/shows/page.tsx
git commit -m "Move shows list to responsive card grid in wide shell"
```

### Task 10: Gallery grids

**Files:**
- Modify: `src/app/gallery/page.tsx` (full rewrite)

**Interfaces:**
- Consumes: `.shell`, `font-display`, `PageHeading` (Task 1); existing `loadGallery` (unchanged).
- Produces: nothing consumed elsewhere.

- [ ] **Step 1: Rewrite the gallery page**

Full new contents of `src/app/gallery/page.tsx` (photo grid 2→3→4→5, square crops kept, corners squared; videos 1→2→3; the oxlint iframe suppression comment must be preserved):

```tsx
import type { Metadata } from "next";
import Image from "next/image";
import { PageHeading } from "@/components/page-heading";
import { loadGallery } from "@/lib/content";

export const metadata: Metadata = { title: "Gallery — PHEVE" };

export default function GalleryPage() {
  const gallery = loadGallery();

  return (
    <main className="shell py-12 md:py-16">
      <PageHeading eyebrow="Photos & video" title="Gallery" />

      <ul className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
        {gallery.photos.map((photo) => (
          <li key={photo.src} className="relative aspect-square overflow-hidden bg-[#111]">
            <Image
              src={photo.src}
              alt={photo.alt}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 50vw, (max-width: 1536px) 25vw, 20vw"
            />
          </li>
        ))}
      </ul>

      {gallery.videos.length > 0 ? (
        <section className="mt-16">
          <h2 className="font-display text-3xl uppercase">Videos</h2>
          <ul className="mt-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {gallery.videos.map((video) => (
              <li key={video.youtubeId} className="aspect-video">
                {/* oxlint-disable-next-line react/iframe-missing-sandbox -- YouTube nocookie
                    embeds require an unsandboxed iframe (sandboxing breaks fullscreen and
                    playback); the embedded content is fully controlled by us via
                    content/gallery.json, not user input. */}
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}`}
                  title={video.title}
                  allowFullScreen
                  className="h-full w-full border-0"
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

- [ ] **Step 2: Final track gate; commit**

Run: `pnpm lint && pnpm typecheck && pnpm format && pnpm test && pnpm build`
Then: `curl -s http://localhost:3000/gallery | grep -c "Gallery"` against the dev server.
Expected: all clean; grep prints ≥1.

```bash
git add src/app/gallery/page.tsx
git commit -m "Widen gallery photo and video grids to full shell"
```

---

## Wave 1 — Track D: Booking + Cart (Tasks 11–12)

Branch: `redesign/track-d-forms` off `feature/site-visual-redesign`, own worktree.
Owns: `src/app/booking/page.tsx`, `src/components/booking-form.tsx`, `src/app/cart/page.tsx`, `src/components/cart-view.tsx`, `e2e/booking.spec.ts`. Touch nothing else.

### Task 11: Booking two-column split + form restyle

**Files:**
- Modify: `src/app/booking/page.tsx` (full rewrite)
- Modify: `src/components/booking-form.tsx` (classNames only)
- Modify: `e2e/booking.spec.ts` (move the validation test out of the env-gated describe)

**Interfaces:**
- Consumes: `.shell`, `.eyebrow`, `.headline-skew`, `.stripe-texture`, `.input-field`, `.btn-primary`, `font-display` (Task 1); existing `BookingForm` logic (unchanged — labels, names, endpoint, states all stay identical so `getByLabel` selectors keep working).
- Produces: nothing consumed elsewhere.

- [ ] **Step 1: Un-gate the validation e2e test**

The bad-email validation test needs no email service (browser validation blocks submit), but it currently sits inside the `RESEND_API_KEY`-gated describe and always skips. Replace the full contents of `e2e/booking.spec.ts` with:

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
});

test.describe("booking form validation", () => {
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

- [ ] **Step 2: Run it to establish the baseline**

Run: `pnpm e2e e2e/booking.spec.ts`
Expected: validation test PASSES against the current page (1 passed, 1 skipped without Resend env). This proves the selectors work *before* the layout change; after the redesign it must still pass.

- [ ] **Step 3: Rewrite the booking page as a two-column split**

Full new contents of `src/app/booking/page.tsx`:

```tsx
import type { Metadata } from "next";
import { BookingForm } from "@/components/booking-form";

export const metadata: Metadata = { title: "Book PHEVE" };

export default function BookingPage() {
  return (
    <main className="shell py-12 md:py-16">
      <div className="grid gap-12 lg:grid-cols-2">
        <section className="stripe-texture border border-zinc-800 bg-[#111] p-8 md:p-12">
          <p className="eyebrow">Booking</p>
          <h1 className="headline-skew mt-2 font-display text-5xl uppercase md:text-6xl">
            Book the band
          </h1>
          <p className="mt-6 max-w-xl text-lg text-zinc-400">
            Weddings, bars, festivals, backyard blowouts — if it has power outlets, we’ll play it.
            Tell us what you’re planning.
          </p>
        </section>
        <div className="max-w-xl">
          <BookingForm />
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Restyle the booking form (classes only)**

In `src/components/booking-form.tsx`, make exactly these changes — logic, field names, labels, and the honeypot stay untouched:

Replace the `inputClass` constant:

```ts
const inputClass = "input-field mt-1";
```

Replace the success message (drop the rounding):

```tsx
      <p className="mt-8 border border-green-900 bg-green-950/40 p-6 text-green-200">
        Got it — we’ll get back to you within a couple of days. 🤘
      </p>
```

Replace the submit button:

```tsx
      <button type="submit" disabled={status === "sending"} className="btn-primary">
        {status === "sending" ? "Sending…" : "Send inquiry"}
      </button>
```

Also change the form's top margin since the split panel now provides the heading (`mt-8 space-y-4` → `space-y-4 lg:mt-2`):

```tsx
    <form onSubmit={handleSubmit} className="space-y-4 lg:mt-2">
```

- [ ] **Step 5: Run the e2e test to verify it still passes**

Run: `pnpm e2e e2e/booking.spec.ts`
Expected: validation test passes (inquiry test runs only with `RESEND_API_KEY`).

- [ ] **Step 6: Verify lint, types, format; commit**

Run: `pnpm lint && pnpm typecheck && pnpm format`

```bash
git add src/app/booking/page.tsx src/components/booking-form.tsx e2e/booking.spec.ts
git commit -m "Split booking page into mood panel and form columns"
```

### Task 12: Cart split layout with sticky summary

**Files:**
- Modify: `src/app/cart/page.tsx` (full rewrite)
- Modify: `src/components/cart-view.tsx` (full rewrite — layout + tap targets; checkout logic unchanged)

**Interfaces:**
- Consumes: `.shell`, `.btn-primary`, `font-display`, `PageHeading` (Task 1); existing `useCart`, `cartSubtotalCents`, `formatCents`, `Product` (unchanged).
- Produces: `CartView({ products }: { products: Product[] })` — same signature. The purchase e2e asserts `getByText("PHEVE Logo Tee")` and clicks `getByRole("button", { name: /checkout/i })` — both must keep working.

- [ ] **Step 1: Rewrite the cart page**

Full new contents of `src/app/cart/page.tsx`:

```tsx
import type { Metadata } from "next";
import { CartView } from "@/components/cart-view";
import { PageHeading } from "@/components/page-heading";
import { loadProducts } from "@/lib/content";

export const metadata: Metadata = { title: "Cart — PHEVE" };

export default function CartPage() {
  return (
    <main className="shell py-12 md:py-16">
      <PageHeading eyebrow="Your haul" title="Cart" />
      <CartView products={loadProducts()} />
    </main>
  );
}
```

- [ ] **Step 2: Rewrite CartView with the split layout**

Full new contents of `src/components/cart-view.tsx`. What changes: line items and a sticky order-summary aside sit in a `lg` two-column grid (stacking to one column below `lg`, summary after the items with the subtotal directly above the checkout button); quantity buttons grow from `h-8 w-8` (32px) to `h-11 w-11` (44px); card corners squared; checkout button becomes `.btn-primary`. The `checkout()` function, stale-line filtering, and empty state are byte-for-byte the same logic:

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
    <div className="mt-10 grid items-start gap-10 lg:grid-cols-[1fr_24rem]">
      <ul className="space-y-4">
        {validItems.map((line) => {
          const product = products.find((p) => p.slug === line.slug);
          if (!product) return null;
          return (
            <li
              key={`${line.slug}-${line.variant}`}
              className="flex flex-wrap items-center justify-between gap-4 border border-zinc-800 bg-[#111] p-4"
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
                  className="h-11 w-11 border border-zinc-700 hover:bg-zinc-800"
                  onClick={() => setQty(line.slug, line.variant, line.quantity - 1)}
                >
                  −
                </button>
                <span className="w-6 text-center">{line.quantity}</span>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  className="h-11 w-11 border border-zinc-700 hover:bg-zinc-800"
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

      <aside className="border border-zinc-800 bg-[#111] p-6 lg:sticky lg:top-8">
        <h2 className="font-display text-2xl uppercase">Order summary</h2>
        <dl className="mt-4 flex items-center justify-between text-lg">
          <dt className="text-zinc-400">Subtotal</dt>
          <dd className="font-bold">{formatCents(cartSubtotalCents(validItems, products))}</dd>
        </dl>
        <p className="mt-2 text-sm text-zinc-500">Flat-rate US shipping added at checkout.</p>
        <button
          type="button"
          disabled={busy}
          onClick={checkout}
          className="btn-primary mt-6 w-full"
        >
          {busy ? "Heading to checkout…" : "Checkout"}
        </button>
        {error ? <p className="mt-4 text-red-400">{error}</p> : null}
      </aside>
    </div>
  );
}
```

- [ ] **Step 3: Final track gate; commit**

Run: `pnpm lint && pnpm typecheck && pnpm format && pnpm test && pnpm build && pnpm e2e e2e/booking.spec.ts`
Expected: all clean; validation e2e passes.

```bash
git add src/app/cart/page.tsx src/components/cart-view.tsx
git commit -m "Split cart into line items and sticky order summary"
```

---

## Wave 2 — Integration (sequential)

### Task 13: Merge tracks, full verification, breakpoint sweep

**Files:**
- Modify: none (merge commits only). Any fix required during integration edits only the file that is broken, with a separate commit explaining why.

**Interfaces:**
- Consumes: all four track branches, each finished and gated.

- [ ] **Step 1: Merge the four track branches**

In the main worktree on `feature/site-visual-redesign`:

```bash
git merge --no-ff redesign/track-a-home
git merge --no-ff redesign/track-b-store
git merge --no-ff redesign/track-c-media
git merge --no-ff redesign/track-d-forms
```

Expected: zero conflicts — the ownership table guarantees disjoint files. A conflict means a track violated its file list; stop and report which files conflicted rather than resolving blindly.

- [ ] **Step 2: Full verification suite**

```bash
pnpm lint && pnpm typecheck && pnpm format:check && pnpm test && pnpm build
```

Expected: all clean, all unit tests pass (cart math, stock, content validation, webhook — untouched by this redesign — plus the new `dates.test.ts`).

- [ ] **Step 3: Full e2e run**

With Docker Postgres up (`pnpm db:setup`):

```bash
pnpm e2e
```

Expected: `nav.spec.ts` (2), `home.spec.ts` (1), `store.spec.ts` (2), `booking.spec.ts` validation (1) all pass. `purchase.spec.ts` and the booking inquiry test pass if Stripe/Resend test env is configured, otherwise self-skip — a skip is acceptable; a failure is not.

- [ ] **Step 4: Breakpoint screenshot sweep**

With the dev server running, capture every page at phone/tablet/desktop widths into the scratchpad and review them:

```bash
mkdir -p shots
for page in "" shows store store/logo-tee gallery booking cart; do
  for size in 375,812 768,1024 1440,900; do
    name="${page//\//-}"
    pnpm exec playwright screenshot --viewport-size "$size" \
      "http://localhost:3000/$page" "shots/${name:-home}-${size%,*}.png"
  done
done
```

(Run from the scratchpad or add `shots/` to local ignores — don't commit screenshots.)

Review each screenshot for: headline skew absent below `md` and no text clipping at 375px; grids at the specified column counts (Store/Gallery 2→3→4→5, Shows 1→2→3); hamburger present at 375px and absent at 1440px; sticky panels in flow (not overlapping the footer); red accents rendering as `#e0111a` not default blue/white buttons; no horizontal scrollbar at any width.

- [ ] **Step 5: Finish the branch**

Use the `superpowers:finishing-a-development-branch` skill: push `feature/site-visual-redesign` and open a PR against `main` describing what the site looks like now (not the process). Suggested verification note for the PR: unit + e2e suites green, screenshot sweep attached.

---

## Deviation rule

Any agent that cannot complete a step as written (missing class, type error from a foundation interface, e2e selector that can't work) STOPS and reports the mismatch instead of improvising a workaround — especially instead of editing a file outside its ownership list.




