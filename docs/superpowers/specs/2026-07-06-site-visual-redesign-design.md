# PHEVE Site Visual Redesign — Design

Date: 2026-07-06
Status: Approved pending final review

## Overview

The current site (built per `2026-07-04-pheve-site-design.md`) wraps every page in a
single narrow centered column (`max-w-2xl` to `max-w-5xl`), so desktop screens show a
lot of unused space on both sides. This redesign restructures layout to use the full
screen width, refreshes the visual identity with a bolder aesthetic, and adds a proper
mobile navigation pattern. It touches every page but keeps the existing content model,
routes, and dynamic behavior (cart, checkout, booking, stock) unchanged.

## Decisions made during brainstorming

Three aesthetic directions were mocked up (loud rock/punk, polished modern dark, warm
party/event). The user selected **loud rock/punk** after comparing home-page and
store-page mockups at both desktop and mobile widths:

- **Scope:** layout restructuring *and* visual refresh (color, type, imagery treatment),
  across all pages (Home, Shows, Store, Store detail, Gallery, Booking, Cart, Nav/Footer).
- **Content assumption:** real band/product photography is expected soon, so layouts
  lean on photography rather than staying logo-only.
- **Aesthetic:** bold, high-contrast, gritty — sharp angles, aggressive type, show-poster
  energy. Black/near-black backgrounds, one red accent, bold condensed display type.

## Width strategy

Two container tiers, replacing the current single `mx-auto max-w-*` pattern:

- **Full-bleed chrome** — nav, hero backgrounds, the stat strip, and footer span the
  full viewport width (100vw) so color, imagery, and texture reach the screen edges.
- **Content shell** — an inner container (`max-w-[90rem]`, ~1440px) with responsive
  padding (`px-6 md:px-12 lg:px-16`) holds actual content. Grids (Store, Gallery, Shows)
  scale column count with breakpoint: 2 cols mobile → 3 tablet → 4 desktop → 5 at ≥1536px.
- **Reading-width exceptions** — the booking form and product descriptions stay capped
  around `max-w-xl`–`max-w-2xl` for legibility, but sit inside the wide shell rather than
  centering the whole page, so surrounding chrome still uses the width.

## Visual system

- **Color:** near-black backgrounds in two shades (`#000` for full-bleed sections, `#111`
  for cards) — close to the current zinc-950/900 usage. One new accent color, a poster
  red (~`#e0111a`), added as a single Tailwind theme token (`pheve-red`). Secondary text
  stays on the existing zinc-400/500 scale.
- **Type:** body copy keeps the current system-sans stack. Headlines (H1s, nav
  wordmark, big stat numbers) use a bold condensed display face — **Anton** via
  `next/font/google` (self-hosted at build, no runtime dependency on Google's CDN).
  Section eyebrows are small, uppercase, red, letter-spaced.
- **Signature motifs**, used consistently across pages, not just the homepage:
  - A subtle `-4deg` skew on big display headlines
  - Angled (`clip-path`) photo panels in heroes instead of plain rectangles
  - A thin repeating diagonal-stripe texture at low opacity behind dark hero sections
  - A 2–3px red bottom border as the nav/section-divider signature
  - Sold-out badges rendered as a rotated stamp/ribbon, not a plain pill
- **Buttons:** primary actions (Add to cart, Follow, Submit) are solid red fill, bold
  uppercase, white text; secondary actions are red-outline ghost buttons.

## Pages

| Page | Change from current |
|---|---|
| **Home** | Full-bleed diagonal hero replaces the centered-logo hero — the raster PHEVE logo shrinks to a nav wordmark treatment; the hero leads with a big skewed headline + tagline over an angled photo panel. Below it, an edge-to-edge 3-up stat strip (Next show / Latest merch drop / Follow) replaces today's "next show card" + "3 stacked buttons." Mailing list form stays a focused, narrower block within the wide shell. |
| **Shows** | Event cards move from a single-column list (`max-w-3xl`) to a responsive grid (1 col mobile → 2 tablet → 3 desktop) inside the wide shell, headed by the same eyebrow + skewed-headline pattern used elsewhere. |
| **Store** | Product grid grows from 2/3 columns to 2/3/4/5 by breakpoint. Product detail page changes from a single stacked column to a split layout: image + clickable thumbnail strip on the left, sticky info/CTA panel on the right. Sold-out renders as a rotated stamp. Size picker changes from a native `<select>` to swatch buttons. |
| **Gallery** | Photo grid grows from 2/3 columns to 2/3/4/5 by breakpoint (same square-crop treatment). Video embeds move from `md:grid-cols-2` to a 2/3-column responsive grid. |
| **Booking** | Splits into two columns on desktop: a mood panel (headline, short pitch, texture/photo) on the left, the form on the right, capped at a readable width. Stacks to one column on mobile. |
| **Cart** | Splits into a line-items list (left, wider) and a sticky order-summary panel (right) with subtotal + checkout button, replacing today's single stacked list with an inline subtotal row. Stacks to one column on mobile, summary pinned above checkout. Quantity buttons grow from 32px to 40–44px tap targets. |
| **Nav/Footer** | Nav becomes a full-bleed black bar with the red bottom-border signature and a hamburger-triggered mobile menu (new `MobileNav` client component) — replacing today's flex-wrap fallback. Footer becomes a full-bleed dark band with wider link spacing. |

## Responsive strategy

Standard Tailwind breakpoints, mobile-first (base styles target phones, enhanced
upward):

- **Nav:** below `md`, collapses into `MobileNav`'s hamburger menu.
- **Hero:** stacks vertically — photo band on top, headline/text below; skew is
  reduced/removed at narrow widths so type doesn't clip.
- **Grids** (Store, Gallery, Shows): 2 columns at the smallest breakpoint (never 1),
  scaling to 3/4/5 as width grows.
- **Split layouts** (Cart, Booking, product detail): single column below `lg`; sticky
  side panels become normal in-flow blocks on mobile.

## Technical notes

- No new npm dependencies. One `next/font/google` import (Anton), exposed as a CSS
  variable and wired into Tailwind's `@theme` block in `globals.css`, alongside one new
  `--color-pheve-red` token.
- New small components: `MobileNav` (hamburger toggle) and `ProductGallery` (client
  component; clickable thumbnail swaps the main product image).
- Diagonal stripe texture and angled photo clip-paths are plain CSS (`clip-path`,
  `repeating-linear-gradient`) — no image assets or libraries needed.

## Testing impact

- The product-detail size picker changes from a native `<select>` to swatch buttons
  (radiogroup semantics). `e2e/purchase.spec.ts` currently does
  `page.getByLabel(/size/i).selectOption("L")` — this step must change to click the
  swatch button instead (e.g. `page.getByRole("radio", { name: "L" })`).
- `e2e/booking.spec.ts` should be checked for any layout-dependent selectors once the
  Booking page's two-column split is implemented (form fields themselves are unchanged).
- No changes to route handlers, database schema, or content JSON shape — unit tests for
  cart math, stock logic, and content validation are unaffected.

## Out of scope

- Any change to the content model — `products.json` already models `images` as an
  array, so the new thumbnail gallery needs no schema change, just UI to use the extra
  entries once real photos are added.
- CMS/admin UI, checkout flow changes, database schema changes.
- New pages beyond the existing set.
- Song list / repertoire page (previously declined).
