# Loving Charmz — Agent Guide

## Project state

Early build — **Phases 1–2 done** (design system + Supabase infra with auth), **Phases 3–8 not implemented**. Most routes, components, data layers, and admin features do not exist yet. See `PLAN.md` for the 8-phase roadmap.

## Stack

Next.js 16 App Router | React 19 | TypeScript 6 strict | TailwindCSS 4 | Supabase (auth, PostgreSQL, storage) | Vitest 4 + testing-library | Playwright | ESLint (core-web-vitals)

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

- Shop pages (`/shop`, `/products/[slug]`, `/collections/[slug]`)
- Cart and checkout
- Customer account pages (profile, orders, wishlist — only layout shells exist)
- Public profile pages
- Custom/personalization order flow
- Admin CRUD pages (products, collections, inventory, orders, etc.)
- API routes and webhooks
- E2E tests
- Integration tests (only unit tests exist)
- `components/shop/` directory is empty

## Docs hierarchy

- `PLAN.md` — implementation roadmap with detailed task breakdown
- `SPEC.md` — full specification (scope, code style, testing strategy, boundaries)
- `design-brief.md` — visual direction, brand identity, animation specs
- `init.md` — initial state overview (stale — prefer `PLAN.md` and `SPEC.md`)
