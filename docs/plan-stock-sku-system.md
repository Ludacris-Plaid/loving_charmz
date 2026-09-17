# Stock & SKU System — Design Plan (NOT yet implemented)

Written down before any code so we can agree on the shape first. This is the
"lets start thinking about that" document.

## Where things stand today (Sept 2026)

- `product_variants` table exists (from the original schema): `name`, `sku`,
  `price_adjustment`, `stock_quantity`, `is_active`, `metadata JSONB`.
- It holds 24 leftover seed variants (Sterling Silver / 14K Gold / Rose Gold per
  product) that do NOT match what the shop actually sells (Brass / Stainless
  Steel, with the RLS view rule hiding zero-stock rows).
- The product page's Brass/Stainless + S/M/L dropdowns are **cosmetic**:
  selections live only in `localStorage` (`product_{id}_selections`) and never
  reach the cart, the order, or any stock record. The only price signal that
  works is stainless steel's +$25, which is also client-side only.
- The admin Inventory page manages these variants but nothing connects the
  dropdowns to them, so "stock per size and metal" is currently impossible —
  which is exactly the itch we're scratching.

## Goals (in your words)

1. Editable stock, everywhere it matters — per **metal type** and per **size**.
2. A SKU system so every sellable combination has an identity (useful for
   labels, custom orders, and book-keeping).
3. Zero manual HTML/JS edits for mom — stock lives in the admin, options in
   the database.

## Proposed design: one variant row per sellable combination

Keep the existing `product_variants` table (do not invent a second system).
One row = one combination:

| product | variant name     | sku                    | price_adjustment | stock |
|---------|------------------|------------------------|------------------|-------|
| Cuff    | Brass / Small    | `CUFF-BR-S`            | 0                | 3     |
| Cuff    | Brass / Medium   | `CUFF-BR-M`            | 0                | 5     |
| Cuff    | Brass / Large    | `CUFF-BR-L`            | 0                | 2     |
| Cuff    | Stainless / Small| `CUFF-SS-S`            | 2500             | 4     |
| …       |                  |                        |                  |       |

Notes on the shape:

- `sku` convention: `{PRODUCT}-{METAL}-{SIZE}` (short, uppercase, unique —
  the column already has a UNIQUE constraint).
- `price_adjustment`: stored in **cents** today by the checkout math; decide
  explicitly (recommendation: keep cents, document it, or add a
  `price_adjustment_cents` column and deprecate the decimal one — pick one
  and be consistent).
- `metadata` JSONB gets `{ "metal": "brass", "size": "medium" }` so the
  product page can group variants into the two dropdowns without new tables.

### Why this design

- The cart, order items, and inventory admin already carry `variant_id` —
  wiring the dropdowns to variants makes stock enforcement work end-to-end
  with **no schema changes** (cart dedupes on `(product_id, variant_id)`;
  order_items already record variant name; inventory admin already edits
  these rows).
- One table, one source of truth. No new joins, no migration risk to the
  live store.
- SKU stays human-typable for mom's workflow (she reads "CUFF-BR-M" and
  knows exactly which box to grab).

## Migration plan (when we build it)

1. **One migration (`0011_variant_options_backfill.sql`)** that:
   - Writes `metadata.metal` / `metadata.size` into existing rows, or
   - Deletes the 24 stale seed variants and re-seeds Brass×3 sizes and
     Stainless×3 sizes per active product with SKUs and a default stock
     (confirm default stock with the user — do not invent numbers silently).
2. **Product page**: dropdown options come from the product's variants
   grouped by `metadata.metal` / `metadata.size`. Selected combination →
   `variant_id`. Price = base + that variant's adjustment (no more
   client-side-only +$25).
3. **Add to cart**: pass the real `variant_id`. Show "sold out" (disabled
   button) when `stock_quantity = 0`; show low-stock hint at ≤2 if desired.
4. **Checkout**: decrement `stock_quantity` on capture (service-role,
   idempotent with the payment webhook), and guard quantity > stock at
   cart-add time.
5. **Inventory admin**: extend the existing page with metal/size columns
   (it already edits stock inline) and a nicer variant grid per product.
6. **SKU display**: show SKU in admin order detail (order_items can carry
   `variant_id` → sku) and optionally on packing slips.

## Open questions for you (answer whenever, no rush)

1. Should a size or metal that hits **0 stock** hide from the dropdown, or
   show as "sold out" (recommended: show, greyed out — customers learn you
   carry it)?
2. Keep stainless steel at **+$25 flat**, or does the adjustment differ per
   size?
3. Default stock when we backfill: all zeros until you enter real counts
   (recommended — nothing sells that you can't ship), or a placeholder?
4. Want SKUs printed anywhere customer-facing, or admin-only?

## What this deliberately does NOT change

- Pricing structure (base price + adjustment), discount codes, payments.
- The homepage's self-updating counts.
- The admin guide — chapter 8 will just get a little longer when this lands.
