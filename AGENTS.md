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
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Vitest unit/integration tests |
| `npm run test:watch` | Vitest watch mode |
| `npm run test:e2e` | Playwright E2E tests |
| `npm run db:seed` | Idempotent seed of 120 orders + 12 customers + wishlist + custom + discount + annotation demo data |

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
- Mobile-first responsive layouts

## Architecture rules

- **Server components by default**, client components only when interactivity is needed
- Route groups: `(marketing)/` for public storefront, `(auth)/` for login/signup
- Admin is role-gated via `components/admin/AdminGuard.tsx` (checks `user_roles` table with service_role client)
- First user is promoted to admin manually (seed or SQL function per `PLAN.md` §2.8)

## Test setup

- Vitest 4 with jsdom environment
- `vitest.setup.ts` stubs `matchMedia` and `IntersectionObserver` globally
- Tests use `@testing-library/react`, `@testing-library/jest-dom/vitest`, `@testing-library/user-event`
- E2E: Playwright (`npm run test:e2e`)

## What does NOT exist yet (agent must not assume)

- API routes and webhooks
- E2E tests
- Integration tests (only unit tests exist)

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
- **Tests**: 75 unit tests in `tests/unit/admin/analytics/` for `aggregate`, `format`, `csv`, `urlState`. Total: 156/156 unit tests pass.
- **CRITICAL — `'use client'` component gotcha**: A `'use client'` component's `children` prop MUST be rendered JSX, not a render-prop function. Server-to-client functions-as-children error: `Functions are not valid as a child of Client Components`. To pass dynamic data into a client component, render the content inside the client component and select via prop (e.g. `tab` id), not via a function-as-children pattern. Constants exported from `'use client'` files (e.g. `ANALYTICS_TABS`) become client-reference proxies when imported into server components — define them in a server-importable module instead.
- **Turbopack stale-cache trap**: When server-component code that passes render-prop functions is edited, the dev server can serve stale compiled chunks. Symptoms: runtime error matches the OLD code. Fix: `pkill -9 -f "next dev" && rm -rf .next && npm run dev`. Hit repeatedly in this session — always do a hard restart when changing the analytics shell structure.
