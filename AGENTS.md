# Loving Charmz — Agent Guide

## Project state

- **Phase 1 done**: design system (TailwindCSS 4, brand tokens, motion, glass, aurora, conic-ring, text-shimmer, ken-burns, etc. in `app/globals.css`)
- **Phase 2 done**: Supabase auth + RLS + storage (migrations 00001, 00002, 00003 — 00002 and 00003 NOT applied to running DB, pending DB password)
- **Phase 3 done**: storefront (home, shop, collections, products, custom-orders, cart, checkout, stories, about, login, signup, account)
- **Phase 4 in progress**: admin dashboard, analytics, products, collections, inventory, orders, customers, personalization, discounts, content — all admin CRUD pages now exist
- **Phase 4 — Analytics**: advanced adjustable analytics dashboard at `/admin/analytics` (8 tabs, drag-to-reorder widgets, date range + compare + granularity + filters + saved views + CSV export, inline status changes, inline stock adjust, inline discount toggle, chart annotations)

## Stack

Next.js 16 App Router | React 19 | TypeScript 6 strict | TailwindCSS 4 | Supabase (auth, PostgreSQL, storage) | Vitest 4 + testing-library | Playwright | ESLint (core-web-vitals) | dnd-kit | date-fns | @supabase/ssr | @supabase/supabase-js 2.x

## Key commands (run in order before committing)

```bash
npm run lint && npm run typecheck && npm run test
```

| Command | Purpose |
|---|---|
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build |
| `npm run icons` | Rasterise the favicons from `app/icon.svg` (see Brand & style system) |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Vitest unit/integration tests |
| `npm run test:watch` | Vitest watch mode |
| `npm run test:e2e` | Playwright E2E tests |
| `npm run db:seed` | Idempotent seed of 120 orders + 12 customers + wishlist + custom + discount + annotation demo data (demo data — do not run against production) |
| `npm run db:migrate` | Supabase project migration tooling: `preflight`, `export`, `schema`, `import`, `storage`, `rewrite`, `verify` — see `supabase/MIGRATION.md` |
| `npm run test:smoke` | Crawl the live production site for console errors, failed requests, broken links (default base: https://lovingcharmz.com) |

## Path alias

`@/*` maps to project **root**, not `src/`. Example: `@/components/ui/Button`, `@/lib/supabase/server`.

## Next.js 16 quirk

Middleware lives in **`proxy.ts`** at root (not `middleware.ts`). Matcher config is exported from `proxy.ts`.

## Supabase clients — three patterns

| File | When to use |
|---|---|
| `lib/supabase/client.ts` — `createClient()` | Browser components (client component) |
| `lib/supabase/server.ts` — `createClient()` | Server components, route handlers, server actions |
| `lib/supabase/admin.ts` — `createAdminClient()` | Admin-only ops that need `service_role` key to bypass RLS |

Auth server actions (signup, login, logout) live in `lib/auth/actions.ts`.

## Supabase project

Current project: **`ivvsglfjlmejwmwofvuw`**. The previous project
(`otareqhvjbcbiehmgzda`) was deleted, so there is no legacy data — accounts, orders and
storage all start empty. See `supabase/MIGRATION.md` for the setup procedure, the
verification gates, and the data-move tooling kept in `scripts/migrate/` for future
project-to-project moves.

Status: migrations `00001`–`00007` applied, catalog seeded (3 collections, 8 products,
24 variants), no accounts yet. Verify a project at any time without database credentials:
`npm run db:verify:api` (expect 23/23).

Migrations `00001`–`00007` are the schema source of truth. **`00007` is required** for
checkout and custom orders to work at all, and it closes a `user_roles` policy that let
any signed-in user grant themselves admin.

## Scripts and Node 20

`@supabase/realtime-js` builds a Realtime client on every `createClient` and throws on
Node < 22 unless a global `WebSocket` exists (Next's own runtime provides one, so the app
is unaffected). Any standalone script must import `scripts/lib/websocket-polyfill.mjs`
**before** `@supabase/supabase-js`; `ws` is a devDependency for that reason.

## Local Supabase workflow

```bash
supabase start          # Start local Supabase (PostgreSQL, auth, storage)
supabase migration up   # Apply new migrations
supabase db reset       # Wipe + re-seed
```

Requires Docker. Local Supabase API runs on `http://127.0.0.1:54321`.

## Brand & style system

- Colors, fonts, radii, shadows, motion tokens in `app/globals.css` `@theme` block (TailwindCSS 4 — no `tailwind.config.js`)
- Fonts: Inter (sans, via `--font-sans`) + Playfair Display (display, via `--font-display`) — loaded via `next/font` in `app/layout.tsx`
- `surface-premium` utility class for card surfaces
- Animations are **CSS-only** (no Framer Motion). See `globals.css` keyframes: `hero-line-in`, `ambient-float`, `reveal-up`, etc.
- `prefers-reduced-motion` respected globally via CSS media query in `globals.css`
- `design-brief.md` contains detailed visual direction (brand tokens, animation specs, layout expectations) — reference it for design decisions
- Favicon: `app/icon.svg` is the hand-authored source of truth (the `LC` monogram on the plum gradient, same mark as `components/marketing/Logo.tsx`). `app/icon.png` (192, Safari ignores SVG favicons), `app/apple-icon.png` (180, full bleed — iOS applies its own corner mask) and `app/favicon.ico` (16/32/48, legacy) are generated from it by `npm run icons` and committed; `tests/unit/brand-icons.test.ts` guards that contract
- Mobile-first responsive layouts

## Architecture rules

- **Server components by default**, client components only when interactivity is needed
- Route groups: `(marketing)/` for public storefront, `(auth)/` for login/signup
- Admin is role-gated via `components/admin/AdminGuard.tsx` (checks `user_roles` table with service_role client)
- The **first account created on a project is auto-promoted to admin** by the
  `on_auth_user_created_promote_admin` trigger (`00002`), which fires while `user_roles` is
  empty. On a fresh project, sign up before anyone else does. Note the corollary: an
  automated test that creates users first will claim that slot — `scripts/migrate/sql/rls-smoke.sql`
  and `scripts/migrate/verify-via-api.ts` both strip the auto-granted role from their
  throwaway users so cross-tenant checks stay meaningful.

## Test setup

- Vitest 4 with jsdom environment
- `vitest.setup.ts` stubs `matchMedia` and `IntersectionObserver` globally
- Tests use `@testing-library/react`, `@testing-library/jest-dom/vitest`, `@testing-library/user-event`
- E2E: Playwright (`npm run test:e2e`)
- **SQL integration tests**: `supabase/tests/*.test.sql` (currently
  `settlement_effects.test.sql` for migration 00011). Plain psql — every test
  builds its own fixtures inside ONE transaction that always rolls back, so the
  suite is safe even against the live project. Run with
  `psql "$DB_URL" -X -v ON_ERROR_STOP=1 -f supabase/tests/settlement_effects.test.sql`.
  In CI, `npm run test:db` (`scripts/test-branch.sh`) creates a **disposable
  Supabase branch**, pushes migrations, runs the suite, and always deletes the
  branch; workflow `.github/workflows/db-integration.yml` triggers on PRs
  touching `supabase/**` and needs the `SUPABASE_ACCESS_TOKEN` +
  `SUPABASE_PROJECT_REF` repo secrets (skips with a warning when unset).

## Production domain

Canonical origin: **https://lovingcharmz.com** (connected and live). The single
source is `SITE_URL` in `lib/site.ts` — never hardcode a hostname in code or
copy; import the constant. `NEXT_PUBLIC_SITE_URL=https://lovingcharmz.com`
belongs on the Vercel project (Production) so payment return URLs, password-reset
redirects and email links use the domain explicitly rather than a code fallback.
The old `loving-charmz.vercel.app` stays attached as a Vercel alias. The nightly
production smoke (`.github/workflows/smoke.yml`) crawls the new domain.

SEO: `app/sitemap.ts` serves `/sitemap.xml` — static marketing routes, all active
product/collection slugs queried from Supabase per render, and the static story slugs
from `stories/page.tsx`; a DB failure degrades to static-only instead of 500ing.
`app/robots.ts` serves `/robots.txt` — storefront crawlable, `/admin`, `/account`,
`/api`, cart/checkout and auth pages disallowed. Both advertise the canonical origin
from `lib/site.ts`, never the request host, so previews never leak into the index.

## What does NOT exist yet (agent must not assume)

- Playwright E2E specs (the `test:e2e` config exists, no specs are written)

## Payments & checkout

Checkout is a **redirect** flow: the order and a provider payment session are created together, then the shopper pays on the provider's own domain.

- **Adapter layer** (`lib/payments/`): `config.ts` (env → provider config; any value matching `your_*` counts as unconfigured), `paypal.ts` (Orders v2: create, capture, webhook verification), `square.ts` (hosted Checkout payment links + webhook HMAC), `index.ts` (registry: `getProvider`, `startPaymentSession`, `confirmPayment`, `verifyAndParseWebhook`), `ledger.ts` (service-role order + `payment_transactions` transitions), `reconcile.ts` (shared webhook application), `returns.ts` (ownership check for return routes), `site.ts` (`getSiteUrl()`, honours `NEXT_PUBLIC_SITE_URL`).
- **Order lifecycle**: `lib/checkout/actions.ts` inserts the order with `payment_status = 'awaiting_payment'` (never bare `'pending'`), writes a `payment_transactions` row, then creates the provider session. If the method is unconfigured or the provider refuses, the order is deleted — no unpaid order without a provider survives. The cart is emptied only when payment is captured.
- **Settlement paths**: `app/api/payments/paypal/capture/[orderId]`, `app/api/payments/square/return/[orderId]` (confirm with the provider, then settle), `app/api/payments/paypal/cancel/[orderId]` (mark failed). `app/api/webhooks/paypal|square` are authoritative and settle orders whose shopper never came back.
- **Security**: return routes load the order through the *member's* client and compare `user_id`; webhooks answer `503` unless `PAYPAL_WEBHOOK_ID` / `SQUARE_WEBHOOK_SIGNATURE_KEY` is set **and** the signature verifies, so an unsigned "payment completed" post can never mark an order paid.
- **Analytics**: `awaiting_payment` is folded into the `pending` bucket by `paymentStatusKey()` in `lib/admin/analytics/queries.ts`, so abandoned checkouts still raise the stuck-payment action item.
- **Money math**: `lib/checkout/pricing.ts` is the single source of truth (subtotal, free shipping over $100, 8% tax, minor-unit conversion). The checkout page and the provider charge call the same function — never recompute totals inline.
- **Local limitation**: the shipped PayPal/Square values are placeholders, so checkout renders "Online payments are not configured" with a disabled button and creates no orders. Square's hosted checkout requires an HTTPS `redirect_url`, so it cannot be exercised from `localhost`.
- **Test seam**: provider tests stub `fetch` (`tests/unit/payments/*`); `resetPayPalTokenCache()` exists because the OAuth token cache is module-level.
- **Embedded card flow**: `chargeCardToken()` (registry) → `createSquareDirectCharge` (adapter) charges a Web Payments SDK token; settlement goes through `recordDirectCharge` in the ledger. Needs `SQUARE_APP_ID` in addition to the other Square vars for the client-side form. The charged amount is always the server-side order total — client-supplied amounts are display-only and ignored.
- **Settlement side effects** (migration `00011`): `markPaymentConfirmed` calls `apply_order_settlement_effects` exactly once per order (guarded by the `order_settlements` table) — decrements variant stock (clamped at zero) and counts the order's discount code against `max_uses`. Stock is also re-validated server-side in `createCheckoutAction` before an order is created.

## Docs hierarchy

- `PLAN.md` — implementation roadmap with detailed task breakdown
- `SPEC.md` — full specification (scope, code style, testing strategy, boundaries)
- `design-brief.md` — visual direction, brand identity, animation specs
- `init.md` — initial state overview (stale — prefer `PLAN.md` and `SPEC.md`)

## Analytics dashboard (`/admin/analytics`)

- **Entry point**: `app/admin/analytics/page.tsx` (server) → `components/admin/analytics/AnalyticsShell.tsx` (client) → tab content.
- **8 tabs**: Overview, Revenue, Products, Inventory, Customers, Discounts, Operations, Custom orders. Tab list in `components/admin/analytics/tabs.ts` (server-importable).
- **Server data**: `lib/admin/analytics/queries.ts::getAnalyticsSnapshot(filters)` — fetches 12 tables in parallel via admin client, applies filters, computes 25+ aggregations (KPIs, time series, top-N, cohort, heatmap, inventory, pipeline, action items).
- **URL state**: `lib/admin/analytics/urlState.ts` — all filter state lives in `?p=…&g=…&c=…&col=…&prd=…&st=…&ps=…&w=…&tab=…`. Decoded/encoded on server, pushed via `router.replace` (no scroll).
- **Manipulation controls**: `DateRangePicker` (7d/30d/90d/YTD/custom + day/week/month granularity), `CompareToggle` (previous-period line + delta%), `FilterChips` (collections, products, order status, payment status), `WidgetVisibilityMenu` (28 widgets across 8 tabs), `SavedViewsMenu` (localStorage), `ExportButton` (CSV per widget).
- **Drag-to-reorder**: `dnd-kit/core` + `@dnd-kit/sortable` + `rectSortingStrategy`. `SortableWidget` wraps each card. Order persisted via `widgets=…` URL param. `PointerSensor` with 4px activation distance.
- **Inline actions**: `InlineOrderStatusMenu`, `InlinePaymentStatusMenu` (via the same component), `InlineStockAdjust`, `InlineDiscountToggle`, `AnnotationDialog` — all server actions in `lib/admin/analytics/actions.ts`, admin-gated, revalidatePath on success.
- **Hand-rolled SVG charts** in `components/admin/analytics/charts/`: `Sparkline` (for KPI cards), `AreaChart` (revenue/orders with previous-period dashed line + annotations), `BarChart` (vertical/horizontal, optional previous bar), `DonutChart` (clickable, hover-highlights), `Heatmap` (7×24 day×hour), `FunnelChart` (with step conversion %), `KpiCard` (with sparkline + delta%).
- **Chart annotations** (notes pinned to specific dates on the revenue chart) require migration `00005_analytics_annotations.sql`. Apply with `supabase db push`.
- **Demo data**: `npm run db:seed` populates 120 orders over 6 months, 12 customers, 10 wishlists, 6 custom requests, 3 discounts, 3 chart annotations. Idempotent (cleans prior seed by `metadata->>seed_tag = 'analytics-seed'` marker).
- **Tests**: 75 unit tests in `tests/unit/admin/analytics/` for `aggregate`, `format`, `csv`, `urlState`. Total: 219/219 unit tests pass across 30 files. Checkout and payments are covered in `tests/unit/checkout/` (pricing, checkout action, embedded Square charge) and `tests/unit/payments/` (config, PayPal, Square). E2E: `tests/e2e/paypal-checkout.mjs` (live PayPal sandbox walkthrough) and `npm run test:smoke` (production crawl, also runs nightly in CI).
- **CRITICAL — `'use client'` component gotcha**: A `'use client'` component's `children` prop MUST be rendered JSX, not a render-prop function. Server-to-client functions-as-children error: `Functions are not valid as a child of Client Components`. To pass dynamic data into a client component, render the content inside the client component and select via prop (e.g. `tab` id), not via a function-as-children pattern. Constants exported from `'use client'` files (e.g. `ANALYTICS_TABS`) become client-reference proxies when imported into server components — define them in a server-importable module instead.
- **Turbopack stale-cache trap**: When server-component code that passes render-prop functions is edited, the dev server can serve stale compiled chunks. Symptoms: runtime error matches the OLD code. Fix: `pkill -9 -f "next dev" && rm -rf .next && npm run dev`. Hit repeatedly in this session — always do a hard restart when changing the analytics shell structure.
- **NavigationProgress base animation trap**: `.nav-progress__bar` base class MUST NOT have `animation` — it runs constantly, visible on every page. Put animation only on `--active`/`--done` state classes. `.nav-progress` base MUST have `opacity: 0` + `transition` so the bar is invisible when idle.
- **useSearchParams() dead code**: Never call `useSearchParams()` if you don't read the value — it causes unnecessary re-renders on every URL param change.
- **CSS animation restart on re-render**: CSS `@keyframes` animations restart when React patches the className attribute. CSS `transition` does not. Prefer `transition` for components that re-render on URL state changes.
- **DonutChart navigation**: Use `router.push(d.href)`, not `window.location.href = d.href` (full page navigate breaks client-side nav).
- **Header avatar**: `getSession()` in `AdminGuard.tsx` now includes `avatarUrl` (fetched from `profiles.avatar_url`). Header uses `session.avatarUrl` to show the user's profile image as a circular avatar link, falling back to "Account"/"Sign in" button.
- **next/image in server components**: Use `<Image>` with `fill` + `sizes` and a `position: relative` parent wrapper. Do NOT use `<img>` (ESLint will warn).
