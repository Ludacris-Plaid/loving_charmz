# Loving Charmz — Beta Implementation Plan

## What "Beta Running Locally" Means

A fully functional local deployment where:
- All storefront pages render with real data from a local Supabase instance
- Users can sign up, log in, manage profiles, maintain wishlists, and browse the catalog
- Cart and checkout work end-to-end (PayPal/Square sandbox)
- Custom orders with photo uploads can be submitted
- Admin can manage products, collections, inventory, orders, customers, content, and discounts without touching code
- All tests pass (unit, integration, E2E)
- The site runs mobile-first and meets accessibility standards

---

## Prerequisites

### Tooling to Install
```bash
# Supabase CLI for local development (PostgreSQL, Auth, Storage, Edge Functions)
brew install supabase/tap/supabase  # macOS
# or via npm: npm install -g supabase

# Docker (required by Supabase local)
# Install Docker Desktop or docker + docker-compose

# Node.js 20+ (already assumed — project uses TS 6)
```

### Environment File
Create `.env.local`:
```bash
# Supabase (from `supabase start` output or cloud project)
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key-from-supabase-start>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key-from-supabase-start>

# PayPal Sandbox
PAYPAL_CLIENT_ID=<sandbox-client-id>
PAYPAL_CLIENT_SECRET=<sandbox-secret>
PAYPAL_MODE=sandbox

# Square Sandbox
SQUARE_ACCESS_TOKEN=<sandbox-access-token>
SQUARE_LOCATION_ID=<sandbox-location-id>
SQUARE_MODE=sandbox

# Mailchimp (optional for beta — can stub)
MAILCHIMP_API_KEY=
MAILCHIMP_AUDIENCE_ID=
MAILCHIMP_SERVER_PREFIX=
```

---

## Phase 1: Design System Foundation (est. 2–3 days)

**Goal**: Establish the visual language, reusable components, and layout shell that every page will use.

### Tasks

#### 1.1 Brand Tokens Expansion
Extend `globals.css` with a full Tailwind v4 `@theme` block.
- **File**: `app/globals.css`
```css
@import "tailwindcss";

@theme {
  --color-brand-50: #fffaf7;
  --color-brand-100: #fff6f1;
  --color-brand-200: #f7ede8;
  --color-brand-300: #f3d7cf;
  --color-brand-400: #d4a99a;
  --color-brand-500: #8f5c4c;
  --color-brand-600: #6f5a53;
  --color-brand-700: #5c392f;
  --color-brand-800: #2d1f1a;

  --color-surface: rgba(255, 255, 255, 0.86);
  --color-surface-strong: #fffdfb;

  --font-sans: 'Inter', ui-sans-serif, system-ui, sans-serif;
  --font-display: 'Playfair Display', Georgia, serif;

  --radius-card: 1.25rem;
  --radius-pill: 9999px;
  --radius-block: 2rem;

  --shadow-card: 0 20px 80px rgba(92, 57, 47, 0.08);
  --shadow-card-hover: 0 24px 90px rgba(92, 57, 47, 0.14);
}
```

#### 1.2 Font Loading
Add `Inter` and `Playfair Display` via `next/font` in `app/layout.tsx`.

#### 1.3 Shared UI Components
Create `components/ui/` primitives:
| Component | Purpose |
|---|---|
| `Button.tsx` | Pill-shaped, primary/secondary/outline variants |
| `Input.tsx` | Styled text input with label, error state |
| `Card.tsx` | Rounded card with border, shadow, surface background |
| `Badge.tsx` | Small pill badge (featured, sale, new) |
| `Skeleton.tsx` | Loading placeholder |
| `EmptyState.tsx` | Empty list messaging |
| `Section.tsx` | Consistent page section wrapper (max-width, padding) |
| `Container.tsx` | Max-width centered container |

Each component should have a corresponding unit test in `tests/unit/components/`.

#### 1.4 Layout Shells
- **Storefront Shell** (`app/(marketing)/layout.tsx`): header nav (logo, shop, stories, about, account link, cart icon), footer (brand message, quick links, legal), mobile hamburger menu
- **Account Shell** (`app/account/layout.tsx`): sidebar nav (profile, wishlist, orders, custom orders, settings), top bar with user info
- **Admin Shell** (`app/admin/layout.tsx`): sidebar nav (all admin sections), top bar with admin user, auth guard (redirect to login if not admin)

#### 1.5 Navigation Components
- `components/marketing/Header.tsx`
- `components/marketing/Footer.tsx`
- `components/marketing/MobileMenu.tsx`
- `components/account/AccountSidebar.tsx`
- `components/admin/AdminSidebar.tsx`
- `components/admin/AdminGuard.tsx` (server component that checks session role)

### Acceptance
- `npm run dev` renders the storefront shell with header, footer, and placeholder content areas
- Mobile hamburger menu opens/closes
- Layout shells exist for storefront, account, and admin
- All UI components have passing unit tests
- `npm run typecheck` and `npm run lint` pass

---

## Phase 2: Supabase Infrastructure & Auth (est. 3–4 days)

**Goal**: Set up local Supabase, define the database schema, wire up authentication with roles, and protect admin routes.

### Tasks

#### 2.1 Supabase Local Setup
```bash
supabase init
supabase start
```
This provisions a local PostgreSQL database, GoTrue auth server, storage, and API gateway at `http://127.0.0.1:54321`.

#### 2.2 Database Schema (Migration 1)
Create `supabase/migrations/00001_initial_schema.sql` with these tables:

**Core tables:**
```sql
-- Users extended profile (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  pet_story TEXT,          -- memorial/pet-bond story area
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Roles for RBAC
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'customer')),
  UNIQUE (user_id, role)
);

-- Products
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  base_price DECIMAL(10,2) NOT NULL,
  images TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  is_personalizable BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Collections (groups of products)
CREATE TABLE collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Collection-product join
CREATE TABLE collection_products (
  collection_id UUID REFERENCES collections(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  sort_order INT DEFAULT 0,
  PRIMARY KEY (collection_id, product_id)
);

-- Product variants (size, metal, etc.)
CREATE TABLE product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT UNIQUE,
  price_adjustment DECIMAL(10,2) DEFAULT 0,
  stock_quantity INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Commerce tables:**
```sql
-- Carts
CREATE TABLE carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID REFERENCES carts(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  quantity INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Orders
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  subtotal DECIMAL(10,2) NOT NULL,
  shipping_cost DECIMAL(10,2) DEFAULT 0,
  tax DECIMAL(10,2) DEFAULT 0,
  discount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  shipping_address JSONB,
  payment_method TEXT,
  payment_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  variant_name TEXT,
  unit_price DECIMAL(10,2) NOT NULL,
  quantity INT NOT NULL DEFAULT 1
);

-- Wishlist
CREATE TABLE wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, product_id)
);

-- Payment transactions
CREATE TABLE payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  provider_transaction_id TEXT,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT NOT NULL,
  provider_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Content & customization tables:**
```sql
-- Personalization requests
CREATE TABLE personalization_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  pet_name TEXT,
  charm_selections TEXT[],
  freeform_text TEXT,
  reference_image_url TEXT,
  status TEXT DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Discount codes
CREATE TABLE discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL(10,2) NOT NULL,
  min_order_amount DECIMAL(10,2) DEFAULT 0,
  max_uses INT,
  current_uses INT DEFAULT 0,
  starts_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Content blocks (homepage sections, about page, story pages)
CREATE TABLE content_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT,
  body TEXT,
  image_url TEXT,
  metadata JSONB DEFAULT '{}',
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### 2.3 Row-Level Security (RLS) Policies
Add RLS policies in the migration:
- `profiles`: users can read public profiles, write their own
- `user_roles`: only admin can read, service role can write
- `products`, `collections`, `collection_products`: public read, admin write
- `product_variants`: public read stock > 0, admin write
- `carts`, `cart_items`: users read/write their own
- `orders`: users read their own, admin read/write all
- `wishlists`: users read/write their own
- `personalization_requests`: users read their own, admin read/write all
- `discounts`: public read active, admin write
- `content_blocks`: public read published, admin write
- `payment_transactions`: users read their own, admin read all

#### 2.4 Supabase Client Setup
- **File**: `lib/supabase/client.ts` — browser Supabase client (for client components)
- **File**: `lib/supabase/server.ts` — server Supabase client (for server components, route handlers, server actions)
- **File**: `lib/supabase/admin.ts` — service role client (for admin operations, webhooks)

#### 2.5 Auth Middleware
- **File**: `lib/auth/middleware.ts` — Next.js middleware that refreshes the Supabase session on every request
- **File**: `lib/auth/actions.ts` — server actions for signup, login, logout
- **File**: `lib/auth/types.ts` — AuthUser, Session types

#### 2.6 Auth Pages
- `app/(auth)/login/page.tsx` — login form (email + password)
- `app/(auth)/signup/page.tsx` — signup form (email + password + username)
- `app/(auth)/layout.tsx` — centered card layout, brand mark at top

#### 2.7 Role-Based Admin Guard
- **File**: `components/admin/AdminGuard.tsx` — server component that reads `user_roles` from DB, redirects to `/login` if not authenticated, shows "Unauthorized" if not admin
- Wrap `app/admin/layout.tsx` with this guard

#### 2.8 First-User Admin Bootstrap
- **File**: `supabase/seed.sql` — inserts a trigger or function that assigns the `admin` role to the first user who signs up, OR create a manual SQL function `promote_to_admin(user_id)` to run after first signup
- Alternative: seed a known admin user with email/password for local dev

#### 2.9 Auth Unit Tests
- `tests/unit/auth/actions.test.ts` — login/signup validation
- `tests/unit/auth/middleware.test.ts` — role check helpers

### Acceptance
- `supabase start` runs cleanly, `supabase migration up` creates all tables
- Signing up creates a user in `auth.users` and a row in `profiles`
- First user can be promoted to admin → can access `/admin`
- Non-admin users visiting `/admin` are redirected
- `npm run test` includes auth unit tests that pass

---

## Phase 3: Product Catalog & Collections (est. 4–5 days)

**Goal**: Build the public-facing catalog — collection listing, product grid, product detail pages, with real Supabase data.

### Tasks

#### 3.1 Data Access Layer
- **File**: `lib/supabase/queries/products.ts` — `getProducts()`, `getProductBySlug(slug)`, `getProductsByCollection(slug)`
- **File**: `lib/supabase/queries/collections.ts` — `getCollections()`, `getCollectionBySlug(slug)`
- **File**: `lib/supabase/types.ts` — TypeScript interfaces for Product, ProductVariant, Collection

All queries are server-only (read from DB with RLS enforcing public read).

#### 3.2 Seed Data (`supabase/seed.sql`)
Insert the 4 Bond Collection products (Phase 1: one collection, MVP launch):

**Bond Collection** — "Each piece is designed to represent connection, whether it's with your pet, your story, or a moment you want to hold onto."

| Product | Type | Tagline | Variants | Base Price |
|---------|------|---------|----------|------------|
| The Loyal Companion | Dog silhouette charm | "Always by your side. Always in your heart." | Silver / Gold / Rose Gold | $55-75 |
| Forever Pawprint | Paw + heart cutout | "They walk beside you for a time, but their mark stays forever." | Silver / Gold / Rose Gold | $55-75 |
| Unbreakable Bond | Infinity bond | "Love that loops endlessly—seen and unseen." | Silver / Gold / Rose Gold | $55-75 |
| Always with Me | Name charm | "Carry their name. Carry their presence." | Silver / Gold / Rose Gold | $65-95 |

**Pricing tiers**: Simple charms $35-65, Personalized/name $55-95, Sea glass + symbolic $85-150+.
All products are `is_personalizable = true` (engraving, charm selection).

#### 3.3 Shop Page
- **File**: `app/(marketing)/shop/page.tsx`
  - Server component fetching `getProducts()`
  - Grid of product cards: image placeholder, name, base price, personalizable badge
  - Category filter chips (by collection)
  - Sort by: featured, price low-high, price high-low, newest

#### 3.4 Collections Page
- **File**: `app/(marketing)/collections/[slug]/page.tsx`
  - Server component fetching collection + its products
  - Hero section with collection image and description
  - Product grid same as shop page but scoped to collection

#### 3.5 Product Detail Page
- **File**: `app/(marketing)/products/[slug]/page.tsx`
  - Server component fetching product + variants
  - Image carousel (placeholder images for now)
  - Product name, price, description
  - Variant selector (radio/chip for each variant)
  - Quantity selector
  - "Add to Cart" button (client component form action)
  - "Add to Wishlist" heart button
  - "Personalize this piece" link → custom orders page (if `is_personalizable`)
  - SEO metadata per product

#### 3.6 Shop Components
| Component | Purpose |
|---|---|
| `components/shop/ProductCard.tsx` | Card for grid (image, name, price, link to detail) |
| `components/shop/ProductGrid.tsx` | Responsive grid wrapper |
| `components/shop/VariantSelector.tsx` | Client component — variant chip/radio selector |
| `components/shop/QuantitySelector.tsx` | Number input with +/- buttons |
| `components/shop/ProductImageCarousel.tsx` | Client component for image browsing |
| `components/shop/CollectionHero.tsx` | Collection header with image + description |

#### 3.7 Unit & Integration Tests
- `tests/unit/shop/ProductCard.test.tsx`
- `tests/unit/shop/VariantSelector.test.tsx`
- `tests/unit/shop/QuantitySelector.test.tsx`
- `tests/integration/catalog.test.ts` — `getProducts()`, `getProductBySlug()`, `getCollectionBySlug()`

### Acceptance
- `/shop` renders a product grid from Supabase data
- `/collections/bond-collection` renders filtered products with collection hero
- `/products/the-loyal-companion` renders full product detail with variants
- All shop component unit tests pass

---

## Phase 4: Cart & Checkout (est. 5–6 days)

**Goal**: Persistent cart tied to user, cart page, checkout flow with PayPal and Square sandbox.

### Tasks

#### 4.1 Cart Logic
- **File**: `lib/cart/client.ts` — client-side cart helpers (add item, update qty, remove item) using server actions + optimistic UI
- **File**: `lib/cart/server.ts` — server-side cart queries (getCart, getCartItems)
- **File**: `lib/cart/actions.ts` — server actions: `addToCart`, `removeFromCart`, `updateCartItemQuantity`

#### 4.2 Cart Context / State
Use a lightweight approach — a client component that wraps cart actions with optimistic UI updates. No heavy state library needed.
- **File**: `components/shop/CartProvider.tsx` — context provider for cart count badge in header

#### 4.3 Cart Page
- **File**: `app/(marketing)/cart/page.tsx`
  - Lists cart items: product image thumbnail, name, variant, unit price, quantity selector, line total
  - Coupon code input
  - Order summary: subtotal, discount, estimated shipping, estimated tax, total
  - "Proceed to Checkout" button
  - Empty state when cart is empty
  - Loading skeleton during fetch

#### 4.4 Cart Components
| Component | Purpose |
|---|---|
| `components/shop/CartItemRow.tsx` | Single cart item row with qty, remove |
| `components/shop/CartSummary.tsx` | Order totals sidebar/panel |
| `components/shop/CouponInput.tsx` | Coupon code input with apply button |
| `components/shop/CartBadge.tsx` | Cart count badge for header icon |
| `components/shop/AddToCartButton.tsx` | Product detail add-to-cart with variant selection |

#### 4.5 Checkout Page
- **File**: `app/(marketing)/checkout/page.tsx`
  - Shipping address form
  - Payment method selector: PayPal or Credit Card (Square)
  - Order review section (items, totals)
  - "Place Order" button
  - Protected route: requires auth

#### 4.6 Payment Integration Layer
- **File**: `lib/payments/types.ts` — PaymentProvider interface, PaymentResult
- **File**: `lib/payments/paypal.ts` — PayPal checkout flow (orders API v2)
  - `createPayPalOrder()` — creates order in PayPal sandbox
  - `capturePayPalOrder()` — captures payment
- **File**: `lib/payments/square.ts` — Square checkout (Web Payments SDK or redirect)
  - `createSquarePayment()` — processes card payment
- **File**: `lib/payments/router.ts` — factory that returns correct provider based on selection

#### 4.7 Order Processing
- **File**: `lib/orders/actions.ts` — `createOrder(cartData, shippingAddress, paymentMethod)`
  - Validates cart is not empty
  - Validates shipping address
  - Creates order + order_items in DB
  - Clears cart
  - Redirects to order confirmation

#### 4.8 Payment API Routes
- `app/api/payments/paypal/create-order/route.ts` — PayPal order creation
- `app/api/payments/paypal/capture-order/route.ts` — PayPal capture
- `app/api/payments/square/process/route.ts` — Square payment processing
- `app/api/webhooks/paypal/route.ts` — PayPal webhook handler (verify signature, update order)
- `app/api/webhooks/square/route.ts` — Square webhook handler

#### 4.9 Order Confirmation Page
- **File**: `app/(marketing)/checkout/confirmation/page.tsx`
  - Order number, items summary, shipping address, estimated delivery
  - "View Order" link to account orders
  - "Continue Shopping" link

#### 4.10 Unit & Integration Tests
- `tests/unit/cart/cart-actions.test.ts` — cart CRUD operations
- `tests/unit/cart/cart-utils.test.ts` — price calculations, discount application
- `tests/unit/payments/validation.test.ts` — payment request formatting
- `tests/integration/cart/cart-workflow.test.ts` — add to cart → view cart → checkout
- `tests/integration/payments/paypal-sandbox.test.ts` — PayPal sandbox flow
- `tests/integration/payments/square-sandbox.test.ts` — Square sandbox flow

### Acceptance
- Add to cart from product page → cart badge updates
- Cart page shows items with correct totals
- Coupon codes apply correctly (percentage and fixed)
- PayPal sandbox checkout completes successfully
- Square sandbox checkout completes successfully
- Order appears in DB with correct status
- Order confirmation page renders
- All cart and payment unit/integration tests pass

---

## Phase 5: Customer Accounts, Profiles & Wishlist (est. 4–5 days)

**Goal**: Account area where customers manage their profile, wishlist, orders, and custom orders.

### Tasks

#### 5.1 Account Dashboard
- **File**: `app/account/page.tsx`
  - Welcome with user's display name
  - Quick stat cards: total orders, wishlist count, pending custom orders
  - Recent order list (last 3)
  - Quick links: edit profile, view wishlist, start custom order

#### 5.2 Profile Management
- **File**: `app/account/profile/page.tsx`
  - Edit form: display name, username (read-only after set), bio, pet story textarea
  - Avatar upload (Supabase Storage)
  - Privacy toggle: `is_public` switch
  - Save button → server action `updateProfile`

#### 5.3 Public Profiles
- **File**: `app/profile/[slug]/page.tsx`
  - Server component: fetches public profile by username
  - If `is_public = false` → "This profile is private" message
  - Profile card: avatar, display name, bio, pet story (formatted text)
  - "Their Wishlist" section (if owner opts in, or show count + link)
  - Not a social feed — just a profile card with the story area

#### 5.4 Wishlist
- **File**: `app/account/wishlist/page.tsx`
  - Grid of wishlist product cards
  - "Add to Cart" button on each
  - "Remove" heart button
- **File**: `app/(marketing)/wishlist/page.tsx` — public wishlist view (simpler, link back to product)
- Server actions: `addToWishlist(productId)`, `removeFromWishlist(productId)`

#### 5.5 Order History
- **File**: `app/account/orders/page.tsx`
  - List of all orders with status badge, date, total
  - Click → `app/account/orders/[id]/page.tsx` — order detail: items, status, shipping, payment info, personalization details if any

#### 5.6 Custom Orders (Account View)
- **File**: `app/account/custom-orders/page.tsx`
  - List of submitted personalization requests with status
  - Click → `app/account/custom-orders/[id]/page.tsx` — request detail: pet name, charms, freeform text, uploaded image preview, admin notes (read-only)

#### 5.7 Settings
- **File**: `app/account/settings/page.tsx`
  - Email preferences (mailing list opt-in)
  - Password change (Supabase auth reset)
  - Account deletion (soft delete)

#### 5.8 Account Components
| Component | Purpose |
|---|---|
| `components/account/ProfileForm.tsx` | Client form for profile editing |
| `components/account/AvatarUpload.tsx` | Supabase Storage upload with preview |
| `components/account/WishlistGrid.tsx` | Grid of wishlist product cards |
| `components/account/OrderListItem.tsx` | Order row: status, date, total |
| `components/account/PrivacyToggle.tsx` | Toggle switch for is_public |

#### 5.9 Unit & Integration Tests
- `tests/unit/account/profile-validation.test.ts`
- `tests/integration/account/profile-workflow.test.ts` — signup → edit profile → view public profile → toggle privacy
- `tests/integration/account/wishlist-workflow.test.ts` — browse → add to wishlist → view wishlist → remove

### Acceptance
- Customer can edit profile, upload avatar, toggle privacy
- Public profile renders at `/profile/[username]`
- Private profiles show "This profile is private"
- Wishlist persists across sessions
- Order history shows past orders with detail view
- All account tests pass

---

## Phase 6: Custom & Personalized Orders (est. 3–4 days)

**Goal**: Full personalization flow with pet name engraving, charm selection, photo upload, and freeform text.

### Tasks

#### 6.1 Custom Orders Landing Page
- **File**: `app/(marketing)/custom-orders/page.tsx`
  - Emotional brand copy about creating a one-of-a-kind keepsake
  - Step-by-step overview of the personalization process
  - Link to start a custom order (or if logged in, jump to form)
  - Gallery of example personalized pieces (static for MVP)

#### 6.2 Personalization Form (Multi-Step)
- **File**: `app/(marketing)/custom-orders/create/page.tsx`
  - **Step 1 — Choose a Product**: grid of personalizable products, or "Start from scratch"
  - **Step 2 — Personalize**:
    - Pet name engraving: text input with character limit
    - Charm selection: multi-select chips from available charms
    - Freeform request: textarea ("Tell us about your pet and what this piece means to you")
  - **Step 3 — Upload Reference**: drag-and-drop or click-to-upload pet photo (Supabase Storage)
  - **Step 4 — Review & Submit**: summary of selections, submit button
- Form state persisted via client-side state (React context or URL search params for back/next)

#### 6.3 Components
| Component | Purpose |
|---|---|
| `components/shop/PersonalizationWizard.tsx` | Multi-step form container |
| `components/shop/ProductSelectorStep.tsx` | Pick personalizable product |
| `components/shop/PetNameStep.tsx` | Pet name engraving + charm chips |
| `components/shop/FreeformStep.tsx` | Textarea for story/request |
| `components/shop/UploadStep.tsx` | Image upload with preview |
| `components/shop/ReviewStep.tsx` | Summary of all selections |

#### 6.4 Supabase Storage Bucket
Create `uploads` bucket via SQL migration:
```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('uploads', 'uploads', false);
```
RLS: users can upload/view their own files, admin can view all.

#### 6.5 Server Actions
- `lib/personalization/actions.ts`: `submitPersonalizationRequest(data)`
  - Uploads image to Supabase Storage
  - Inserts row into `personalization_requests`
  - Optionally creates a draft order
  - Returns confirmation with request ID

#### 6.6 Confirmation Page
- **File**: `app/(marketing)/custom-orders/confirmation/page.tsx`
  - Thank you message with emotional brand copy
  - Summary of submitted request
  - "We'll reach out within 2-3 business days with a quote"
  - Link to view request in account

#### 6.7 Unit & Integration Tests
- `tests/unit/personalization/validation.test.ts` — pet name length, allowed characters, charm validation
- `tests/integration/personalization/submit-workflow.test.ts` — complete form submission
- `tests/integration/personalization/upload.test.ts` — image upload flow

### Acceptance
- Multi-step form completes without errors
- Image upload works (stores in Supabase Storage)
- Request appears in DB with all fields populated
- Confirmation page renders with submitted data
- Request visible in account > custom orders
- All personalization tests pass

---

## Phase 7: Admin Dashboard (est. 5–7 days)

**Goal**: Build the admin area with CRUD for all entities, protected behind the admin role guard.

### Tasks

#### 7.1 Admin Dashboard Home
- **File**: `app/admin/page.tsx`
  - Quick stat cards: total orders today/this week, total revenue, active products, pending personalization requests, active discounts
  - Recent orders list
  - Pending personalization requests list
  - Quick action buttons: add product, create discount, view orders

#### 7.2 Product Management
- **File**: `app/admin/products/page.tsx` — table listing all products with search/filter, edit/delete actions
- **File**: `app/admin/products/create/page.tsx` — product creation form
- **File**: `app/admin/products/[id]/edit/page.tsx` — product edit form
- Server actions: `createProduct`, `updateProduct`, `deleteProduct`, `addVariant`, `updateVariant`

Fields: name, slug (auto-generated), description, base_price, images (upload), is_active, is_personalizable, variants (inline add/edit with SKU, price adjustment, stock)

#### 7.3 Collection Management
- **File**: `app/admin/collections/page.tsx` — list collections
- **File**: `app/admin/collections/create/page.tsx` — create/edit collection form
- Drag-and-drop product ordering within collection (or simple sort_order field)

#### 7.4 Inventory Management
- **File**: `app/admin/inventory/page.tsx`
  - Table: product name, variant, SKU, current stock, low-stock warning
  - Inline stock adjustment (increment/decrement with reason)
  - Filter by low stock, out of stock

#### 7.5 Order Management
- **File**: `app/admin/orders/page.tsx` — orders table with status filter, date range, search
- **File**: `app/admin/orders/[id]/page.tsx` — order detail: customer info, items, shipping address, payment info, personalization request link, status dropdown (pending → processing → shipped → delivered), internal notes

#### 7.6 Customer Management
- **File**: `app/admin/customers/page.tsx` — customer list with search
- **File**: `app/admin/customers/[id]/page.tsx` — customer detail: profile info, order history, wishlist, personalization requests

#### 7.7 Personalization Request Management
- **File**: `app/admin/personalization/page.tsx` — list of all requests with status filter
- **File**: `app/admin/personalization/[id]/page.tsx` — request detail with admin notes field, status update (pending → reviewing → quoted → in-progress → completed), ability to link to an order

#### 7.8 Content Management
- **File**: `app/admin/content/page.tsx` — list content blocks
- **File**: `app/admin/content/[id]/edit/page.tsx` — edit content block (rich text editor, or simple textarea for MVP)
- Content blocks control: homepage hero text, about page copy, story pages, announcement banners

#### 7.9 Discount Management
- **File**: `app/admin/discounts/page.tsx` — list active/inactive discounts
- **File**: `app/admin/discounts/create/page.tsx` — create discount form
  - Code, type (percentage/fixed), value, min order amount, max uses, date range, active toggle

#### 7.10 Basic Analytics
- **File**: `app/admin/analytics/page.tsx`
  - Cards: total orders, total revenue, average order value, total customers
  - Simple bar chart: orders per day (last 30 days)
  - Revenue chart: revenue per day (last 30 days)
  - Top-selling products list
  - Dashboard is purely server-rendered for MVP (no chart library needed — CSS bar charts are sufficient)

#### 7.11 Admin UI Components
| Component | Purpose |
|---|---|
| `components/admin/StatCard.tsx` | Number + label card (revenue, orders, etc.) |
| `components/admin/DataTable.tsx` | Reusable sortable/filterable table |
| `components/admin/StatusBadge.tsx` | Color-coded status badges |
| `components/admin/ConfirmDialog.tsx` | Delete confirmation modal |
| `components/admin/InlineEdit.tsx` | Inline editable field |
| `components/admin/AdminBreadcrumb.tsx` | Breadcrumb navigation |
| `components/admin/BarChart.tsx` | Simple CSS bar chart |

#### 7.12 Admin Unit & Integration Tests
- `tests/unit/admin/admin-guard.test.tsx` — AdminGuard redirect behavior
- `tests/unit/admin/product-actions.test.ts` — CRUD operations validation
- `tests/unit/admin/discount-validation.test.ts` — discount code validation
- `tests/integration/admin/product-crud.test.ts` — create → edit → delete product
- `tests/integration/admin/order-management.test.ts` — view → update order status

### Acceptance
- Admin dashboard renders stats pulled from real data
- Product CRUD fully works (create, edit, delete, variants)
- Collection management works with product assignment
- Inventory can be adjusted inline
- Order status can be updated, notes saved
- Content blocks can be edited and published → reflected on public pages
- Discount codes can be created and validated at checkout
- Analytics dashboard renders real data
- Non-admin users receive 401/redirect on admin routes
- All admin tests pass

---

## Phase 8: Polish, E2E Tests & Beta Readiness (est. 2–3 days)

**Goal**: End-to-end testing of all core journeys, accessibility audit, final polish.

### Tasks

#### 8.1 E2E Tests (Playwright)
- `tests/e2e/catalog-journey.spec.ts` — browse collection → view product → add to cart → checkout
- `tests/e2e/auth-profile.spec.ts` — sign up → create profile → update avatar/bio/privacy
- `tests/e2e/wishlist.spec.ts` — add product to wishlist → view wishlist → remove
- `tests/e2e/personalization.spec.ts` — submit personalized order with upload and freeform request
- `tests/e2e/admin-crud.spec.ts` — admin login → manage product → update inventory → view order
- `tests/e2e/responsive.spec.ts` — verify critical pages render correctly at mobile/tablet/desktop widths
- `tests/e2e/a11y.spec.ts` — axe-core accessibility checks on key pages and forms

#### 8.2 Mobile Responsiveness Audit
Manually test every page at these breakpoints:
- 320px (small phone)
- 375px (iPhone)
- 414px (large phone)
- 768px (tablet)
- 1024px (small desktop)
- 1440px (large desktop)

Fix layout issues, especially:
- Navigation (mobile menu overlay)
- Product grid (2-col → 3-col → 4-col)
- Cart (full-width mobile with summary stacked above)
- Checkout (single-column mobile)
- Admin tables (horizontal scroll on small screens)
- Personalization wizard steps (full-width on mobile)

#### 8.3 Accessibility Checklist
- All images have meaningful alt text
- Form inputs have associated labels
- Color contrast meets WCAG AA (check brand palette)
- Focus indicators visible on all interactive elements
- Skip-to-content link on storefront
- Admin data tables are keyboard navigable
- Modal dialogs trap focus
- ARIA labels on icon-only buttons (cart, wishlist heart, menu hamburger)

#### 8.4 SEO Metadata
Add per-page metadata:
- Product pages: product name, description, Open Graph image
- Collection pages: collection name, description
- Shop page: "Shop Pet Bond Jewelry — Loving Charmz"
- Custom orders: "Create a Personalized Keepsake — Loving Charmz"

#### 8.5 Loading & Error States
- All data-fetching pages show loading skeletons
- Empty states for: no products in collection, empty cart, zero orders, zero wishlist items, empty admin tables
- Error boundaries for 404 (product not found), 500 (server error), auth errors

#### 8.6 Final Verification Checklist
- [ ] `npm run dev` starts without errors
- [ ] `npm run build` compiles without TypeScript errors
- [ ] `npm run lint` passes with zero warnings
- [ ] `npm run typecheck` passes
- [ ] `npm run test` — all unit and integration tests pass
- [ ] `npm run test:e2e` — all E2E tests pass
- [ ] Supabase local is running (`supabase status`)
- [ ] All migrations applied (`supabase migration list`)
- [ ] Seed data populates catalog
- [ ] Full journey test:
  1. Visit `/shop` → products rendered
  2. Click product → detail page with variants
  3. Add to cart → cart badge updates
  4. Go to `/cart` → cart items with totals
  5. Proceed to checkout → fill shipping, select PayPal → complete sandbox payment
  6. Order confirmation page loads
  7. Go to `/account/orders` → order appears
  8. Sign out → sign in as different user → repeat with Square payment
  9. Sign in as admin → `/admin` loads with stats
  10. Create new product → appears on shop
  11. Update inventory → reflected on product page
  12. Edit content block → reflected on homepage
  13. Visit `/admin/personalization` → requests visible
  14. Create discount → applies at checkout
- [ ] Mobile: all above works on 375px viewport

---

## Phase Dependency Graph

```
Phase 1 (Design System)
    ↓
Phase 2 (Supabase + Auth)
    ↓
Phase 3 (Catalog) ──────────────────────┐
    ↓                                    │
Phase 4 (Cart + Checkout) ──────┐        │
    ↓                            │        │
Phase 5 (Accounts + Profiles)    │        │
    ↓                            │        │
Phase 6 (Custom Orders)          │        │
    ↓                            ↓        │
Phase 7 (Admin Dashboard) ← all data from above phases
    ↓
Phase 8 (Polish + E2E + Beta readiness)
```

Phases 3–6 can partially overlap in development (different page trees), but Phase 7 depends on all prior data models being complete.

---

## Local Dev Workflow (Daily)

```bash
# 1. Start Supabase (keep running in background)
supabase start

# 2. Apply any new migrations
supabase migration up

# 3. Seed data (after Phase 3)
supabase db reset  # wipes + re-seeds

# 4. Start Next.js dev server
npm run dev

# 5. In another terminal — run tests in watch mode
npm run test:watch

# 6. Before committing — full check
npm run lint && npm run typecheck && npm run test

# 7. E2E tests (when applicable)
npx playwright install  # first time only
npm run test:e2e
```

---

## Beta Launch Checklist

When all 8 phases are complete:

- [ ] All tables exist in Supabase (19 tables)
- [ ] RLS policies active on all tables
- [ ] Auth flows work (signup, login, logout, password reset)
- [ ] Admin guard blocks non-admin users
- [ ] First user can be promoted to admin
- [ ] Product catalog browsable with real seed data
- [ ] Product detail pages render with variants
- [ ] Cart persists across page navigation and sessions
- [ ] Checkout completes via PayPal sandbox
- [ ] Checkout completes via Square sandbox
- [ ] Webhook endpoints receive and process payment events
- [ ] Order confirmation page renders
- [ ] Customer can create and edit profile
- [ ] Avatar upload works (Supabase Storage)
- [ ] Public profiles render at `/profile/[username]`
- [ ] Private profile shows "This profile is private"
- [ ] Wishlist persists and renders
- [ ] Order history shows past orders
- [ ] Custom order form completes with image upload
- [ ] Personalization request appears in DB
- [ ] Admin can CRUD products with variants
- [ ] Admin can CRUD collections and assign products
- [ ] Admin can adjust inventory
- [ ] Admin can update order statuses
- [ ] Admin can manage content blocks
- [ ] Admin can create and manage discounts
- [ ] Admin analytics dashboard shows real data
- [ ] Admin manages personalization requests
- [ ] Site renders correctly at 320px, 375px, 414px, 768px, 1024px, 1440px
- [ ] All images have alt text
- [ ] Form labels are associated with inputs
- [ ] Color contrast meets WCAG AA
- [ ] Focus indicators visible
- [ ] Keyboard navigation works
- [ ] SEO metadata present on all public pages
- [ ] Loading skeletons on all data-fetching pages
- [ ] Error states handled (404, 500, auth errors)
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All E2E tests pass
- [ ] `npm run build` succeeds
- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes

---

## File Count Estimate

| Area | Approx Files |
|---|---|
| UI components | ~30 |
| Marketing components | ~8 |
| Shop components | ~10 |
| Account components | ~8 |
| Admin components | ~12 |
| Lib (queries, actions, helpers) | ~25 |
| Pages (all routes) | ~35 |
| API routes + webhooks | ~6 |
| Tests (unit + integration + e2e) | ~25 |
| Config + schema + seed | ~5 |
| **Total** | **~165** |