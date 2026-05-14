# Loving Charmz — Project Init

## Overview

Loving Charmz is a mobile-first ecommerce website for a meaning-driven jewelry brand focused on symbolic pet-bond, memorial, and connection jewelry. Built with Next.js 16 App Router, React 19, TypeScript 6, and TailwindCSS 4. Backend services run on Supabase (auth, PostgreSQL, file storage) with PayPal, Square, and Mailchimp integrations.

## Current State

The project is freshly scaffolded. Git has no commits yet. Only the foundational layer exists:

- **Root layout** (`app/layout.tsx`): sets metadata and global HTML structure
- **Global CSS** (`app/globals.css`): brand palette defined via CSS custom properties (warm neutrals, rose/accent tones), TailwindCSS 4 base import, background gradient
- **Marketing home page** (`app/(marketing)/page.tsx`): brand header, featured keepsake card, three highlight cards (Connection/Meaning/Permanence), CTAs to `/shop` and `/custom-orders`, customer account link
- **One unit test** (`tests/unit/home-page.test.tsx`): verifies heading and CTA link rendering

No other routes, components, or data layers exist yet. Auth, database, and admin are not wired up.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19, TailwindCSS 4 |
| Language | TypeScript 6 (strict mode) |
| Backend platform | Supabase — auth, PostgreSQL, storage, admin content |
| Payments | PayPal, Square |
| Email marketing | Mailchimp |
| Unit/Integration tests | Vitest 4 + @testing-library/react |
| E2E tests | Playwright |
| Lint | ESLint (eslint-config-next/core-web-vitals) |
| CSS processing | PostCSS + Tailwind |

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Lint all files
npm run typecheck    # TypeScript check (no emit)
npm run test         # Run unit/integration tests (vitest)
npm run test:watch   # Vitest in watch mode
npm run test:e2e     # Playwright E2E tests
```

## Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
SQUARE_ACCESS_TOKEN=
SQUARE_LOCATION_ID=
MAILCHIMP_API_KEY=
MAILCHIMP_AUDIENCE_ID=
MAILCHIMP_SERVER_PREFIX=
```

## Project Structure (Target)

```
app/
  (marketing)/         # Public storefront pages
    page.tsx           # Homepage ✓
    shop/page.tsx
    collections/[slug]/page.tsx
    products/[slug]/page.tsx
    stories/page.tsx
    about/page.tsx
    custom-orders/page.tsx
    wishlist/page.tsx
  (auth)/              # Auth route group
    login/page.tsx
    signup/page.tsx
  account/             # Logged-in customer area
    profile/page.tsx
    wishlist/page.tsx
    orders/page.tsx
    custom-orders/page.tsx
    settings/page.tsx
  profile/[slug]/      # Public customer profiles
  admin/               # Admin dashboard (role-gated)
    products/page.tsx
    collections/page.tsx
    inventory/page.tsx
    orders/page.tsx
    customers/page.tsx
    personalization/page.tsx
    content/page.tsx
    discounts/page.tsx
    analytics/page.tsx
  api/                 # Route handlers
    payments/
    webhooks/
    mailchimp/
components/            # Shared components
  ui/
  marketing/
  shop/
  account/
  admin/
lib/                   # Business logic libraries
  supabase/
  auth/
  payments/
  mailchimp/
  validation/
  utils/
tests/
  unit/
  integration/
  e2e/
```

## Architecture Decisions

- **Server components by default**, client components only when interactivity requires them
- **Route groups** separate marketing/auth storefront concerns
- **Admin is fully protected** by role-based access control — first platform user is admin
- **All brand/content** editable through admin-managed data models (no hardcoded copy outside structural UI)
- **Payment layer** kept modular to support both PayPal and Square in v1
- **Public customer profiles** are opt-in by default with privacy controls

## Code Conventions

- TypeScript everywhere, strict mode
- Mobile-first responsive layouts
- No fake content, fake reviews, or misleading claims
- No new third-party services without approval (locked to Supabase, PayPal, Square, Mailchimp)
- Do NOT use Shopify, marketplace/multi-vendor features, or generic luxury aesthetics
- Accessibility is required
- Explicit naming over terse naming
- Simple, boring solutions over clever abstractions

## Implementation Order (Recommended)

1. ~~App scaffold and design system foundation~~ ✓
2. Supabase auth, roles, and admin protection
3. Catalog, collections, and product detail pages
4. Cart and checkout integration
5. Wishlist and customer profiles
6. Personalization flow with uploads
7. Admin MVP (products, orders, inventory, content)
8. Sales dashboard, discounts, Mailchimp integration

## Git

No commits exist yet. First commit should include the scaffold with the init file.