# Loving Charmz Specification

## 1. Objective

### Product goal
Build a mobile-first ecommerce website for **Loving Charmz**, a meaning-driven jewelry brand focused on symbolic pet-bond, memorial, and connection jewelry.

### Primary audience
- Primary: pet lovers buying for themselves
- Secondary: memorial buyers
- Secondary: gift buyers

### Business positioning
Loving Charmz is not a general jewelry store and not a budget brand. It is a meaning-driven mid-premium brand centered on emotional connection, memory, permanence, and storytelling.

### Core brand themes
- Connection — “Because they’re not just pets.”
- Meaning — “Every symbol carries a story.”
- Permanence — “Made to stay with you.”

### Primary business objectives
1. Sell products directly online
2. Capture custom and personalized order intent
3. Build customer accounts centered around pet and memorial storytelling
4. Give the business owner a comprehensive admin dashboard to manage the business

### MVP customer-facing scope
- Product catalog
- Product detail pages
- Cart
- Checkout
- Customer accounts
- Wishlist
- Custom/personalized order flow
- Customer profile with avatar, short bio, and pet/memorial-focused personal story area
- Public customer profiles by default, with opt-out privacy controls

### MVP customization scope
The custom/personalized flow should support all of the following:
- Pet name engraving
- Charm selection
- Pet photo or reference upload
- Freeform request form

### MVP admin scope
Admin access is restricted to admin users only. The first platform user is the admin.

MVP admin includes:
- Product management
- Collection management
- Inventory management
- Order management
- Customer management
- Wishlist visibility/insight where appropriate
- Personalization request management
- Homepage and marketing content management
- Storytelling content management
- Coupon/discount management
- Basic sales dashboard and reporting

### Later-phase admin scope
These are intentionally deferred beyond MVP:
- Advanced campaign automation
- Deeper financial reporting
- Rich analytics automation
- Broader business operations intelligence

### Payment and communication integrations
- Payments: PayPal and Square
- Email marketing: Mailchimp
- Backend platform: Supabase for auth, database, storage, and admin-backed content/data

### Acceptance criteria
The first launch is successful when:
1. Customers can browse collections and products on mobile and desktop
2. Customers can create accounts and maintain profiles with opt-out privacy control
3. Customers can save items to a wishlist
4. Customers can customize products and submit personalization details, including uploads
5. Customers can complete checkout using PayPal or Square
6. Admin can fully manage catalog, orders, inventory, content, customers, and discounts without editing code
7. Public-facing pages communicate the emotional brand position clearly and consistently

---

## 2. Commands

These commands define the expected local development workflow once implementation begins.

### Setup
```bash
npm install
```

### Development
```bash
npm run dev
```

### Lint
```bash
npm run lint
```

### Typecheck
```bash
npm run typecheck
```

### Tests
```bash
npm run test
npm run test:watch
npm run test:e2e
```

### Production build
```bash
npm run build
npm run start
```

### Supabase local workflow
```bash
supabase start
supabase db reset
supabase migration up
```

### Expected environment variables
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

---

## 3. Project Structure

This repo is currently a fresh build target. The project should be structured around a Next.js App Router application with a clear separation between storefront, account area, and admin.

```text
/ app
  / (marketing)
    / page.tsx
    / shop/page.tsx
    / collections/[slug]/page.tsx
    / products/[slug]/page.tsx
    / stories/page.tsx
    / about/page.tsx
    / custom-orders/page.tsx
    / wishlist/page.tsx
  / (auth)
    / login/page.tsx
    / signup/page.tsx
  / account
    / page.tsx
    / profile/page.tsx
    / wishlist/page.tsx
    / orders/page.tsx
    / custom-orders/page.tsx
    / settings/page.tsx
  / profile/[slug]/page.tsx
  / admin
    / page.tsx
    / products/page.tsx
    / collections/page.tsx
    / inventory/page.tsx
    / orders/page.tsx
    / customers/page.tsx
    / personalization/page.tsx
    / content/page.tsx
    / discounts/page.tsx
    / analytics/page.tsx
  / api
    / payments/*
    / webhooks/*
    / mailchimp/*
/ components
  / ui
  / marketing
  / shop
  / account
  / admin
/ lib
  / supabase
  / auth
  / payments
  / mailchimp
  / validation
  / utils
/ db
  / migrations
  / seed
/ public
  / images
  / brand
/ tests
  / unit
  / integration
  / e2e
```

### Architectural guidance
- Use **Next.js App Router**
- Use **Supabase** for authentication, PostgreSQL data, storage, and admin-managed content
- Use **server components by default**, client components only when interaction requires them
- Use route groups to separate storefront and auth concerns
- Build admin as a protected application area with role-based access control
- Keep all brand content editable via admin-managed data models

### Core data domains
Expected major data models:
- users
- profiles
- roles
- products
- product_variants
- collections
- inventory
- wishlists
- carts
- orders
- order_items
- personalization_requests
- uploaded_assets
- discounts
- content_blocks
- testimonials (real only)
- marketing_campaign_references
- payment_transactions

---

## 4. Code Style

### General principles
- Prefer simple, boring solutions over clever abstractions
- Build only what the approved scope requires
- Keep components focused and reusable only when reuse is real
- Avoid speculative architecture
- Use TypeScript everywhere

### Frontend style
- Mobile-first layouts
- Premium emotional storytelling in visual hierarchy and copy placement
- Clean, modern presentation with subtle motion
- Avoid generic luxury aesthetics
- Accessibility is required, not optional
- Admin dashboard should feel visually dynamic, polished, and impressive without sacrificing clarity

### Implementation conventions
- Use server actions or route handlers only where they clearly fit
- Validate all external/user input at boundaries
- Keep business logic out of page components when possible
- Prefer explicit naming over terse naming
- Do not add fake content, fake reviews, or misleading brand claims
- Do not introduce dependencies without approval if they expand the agreed service footprint

### Security and access
- Role-based access control for admin routes
- Public profiles must support opt-out privacy
- Uploaded content should be scoped and access-controlled appropriately
- Admin-only functionality must never be exposed to standard customers

---

## 5. Testing Strategy

### Testing priorities
The site should be verified across storefront, account, checkout, personalization, and admin workflows.

### Unit tests
Use unit tests for:
- data transformations
- pricing calculations
- personalization validation
- permission helpers
- inventory logic
- payment request formatting

### Integration tests
Use integration tests for:
- Supabase auth and role flows
- wishlist behavior
- cart and checkout orchestration
- personalization request submission
- admin CRUD flows
- content publishing behavior

### End-to-end tests
Use E2E tests for core journeys:
1. Browse collection → view product → add to cart → checkout
2. Sign up → create profile → update avatar/bio/privacy settings
3. Add product to wishlist
4. Submit personalized/custom order with upload and freeform request
5. Admin login → manage product → update inventory → view order

### Non-functional verification
- Responsive behavior on mobile-first breakpoints
- Accessibility checks on key pages and forms
- Payment flow verification for PayPal and Square
- Upload flow verification
- Admin authorization verification

---

## 6. Boundaries

### Always do
- Build mobile-first
- Build SEO-first public pages
- Maintain accessibility standards
- Preserve premium emotional storytelling throughout the storefront
- Keep checkout fast and simple
- Keep all editable site content manageable through the admin dashboard

### Ask first before
- Adding any new third-party services beyond Supabase, PayPal, Square, and Mailchimp
- Adding analytics or cookie tracking
- Adding AI features
- Changing payment architecture
- Introducing major new dependencies that materially affect the stack
- Expanding scope beyond approved MVP

### Never do
- Do not use Shopify
- Do not build marketplace or multi-vendor features
- Do not use generic luxury branding that ignores the emotional pet-bond focus
- Do not add fake testimonials, fake reviews, or misleading trust signals
- Do not build a general social feed outside the pet/memorial profile concept
- Do not add features outside the approved scope without approval

---

## Notes for implementation planning

### Recommended first implementation slices
1. App scaffold and design system foundation
2. Supabase auth, roles, and admin protection
3. Catalog, collections, and product detail pages
4. Cart and checkout integration
5. Wishlist and customer profiles
6. Personalization flow with uploads
7. Admin MVP for products, orders, inventory, and content
8. Sales dashboard, discounts, and Mailchimp integration

### Open complexity note
Supporting both PayPal and Square in v1 increases checkout and webhook complexity. This is accepted project scope, but implementation should keep the payment layer modular and minimal.
