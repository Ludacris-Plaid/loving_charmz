-- ============================================================
-- 00013 — Structured inventory: material × size variants
--
-- The shop sells charms in (stainless steel | brass) × (S | M | L).
-- Previously a charm had ONE variant ("Stainless steel") and the
-- storefront's metal/size selectors were cosmetic — the cart always
-- received variants[0] and the real choice lived in localStorage.
--
-- This migration makes every material×size combination a REAL variant
-- row, which is the unit the whole system already runs on (cart lines,
-- checkout stock checks, settlement decrement, order snapshots, emails,
-- analytics all key on product_variants.id).
--
-- Fully additive: nothing existing is dropped or renamed. Jewelry keeps
-- its material-only variants (size stays NULL).
-- ============================================================

-- ------------------------------------------------------------
-- 1. Product kind: 'charm' gets the 2×3 matrix, 'jewelry' stays
--    material-only. Default matches every existing product.
-- ------------------------------------------------------------
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'jewelry';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_kind_check'
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_kind_check CHECK (kind IN ('charm', 'jewelry'));
  END IF;
END $$;

-- The two charm products (Companion Charm, Faithful Friend). Hardcoded
-- slugs — a deliberate one-off; kind is editable in the admin afterwards.
UPDATE public.products
SET kind = 'charm'
WHERE slug IN ('companion', 'faithful friend');

-- ------------------------------------------------------------
-- 2. Variant attributes. NULL = "this product doesn't use this
--    dimension" (jewelry size, or any legacy/other product).
-- ------------------------------------------------------------
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS material TEXT;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS size TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'product_variants_material_check'
  ) THEN
    ALTER TABLE public.product_variants
      ADD CONSTRAINT product_variants_material_check
      CHECK (material IS NULL OR material IN (
        'stainless_steel', 'brass',
        'sterling_silver', 'gold_14k', 'rose_gold'
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'product_variants_size_check'
  ) THEN
    ALTER TABLE public.product_variants
      ADD CONSTRAINT product_variants_size_check
      CHECK (size IS NULL OR size IN ('small', 'medium', 'large'));
  END IF;
END $$;

-- ------------------------------------------------------------
-- 3. Backfill existing variants from their human names, and map
--    existing charm stock onto that material's MEDIUM combo.
--    (Companion: 20× stainless-steel M, Faithful Friend: 1× brass M.)
-- ------------------------------------------------------------
UPDATE public.product_variants
SET material = CASE
  WHEN name ILIKE '%stainless%' THEN 'stainless_steel'
  WHEN name ILIKE '%brass%'     THEN 'brass'
  WHEN name ILIKE '%sterling%'  THEN 'sterling_silver'
  WHEN name ILIKE '%rose%'      THEN 'rose_gold'
  WHEN name ILIKE '%14k%' OR name ILIKE '%gold%' THEN 'gold_14k'
  ELSE NULL
END;

-- Charms: everything lands on Medium; stainless carries the +$25
-- adjustment the storefront has been *displaying* (checkout never
-- actually charged it before — this fixes that mismatch).
UPDATE public.product_variants v
SET size = 'medium',
    price_adjustment = CASE WHEN v.material = 'stainless_steel' THEN 25.00 ELSE v.price_adjustment END
FROM public.products p
WHERE v.product_id = p.id
  AND p.kind = 'charm'
  AND v.material IS NOT NULL;

-- Normalize charm SKUs to the matrix scheme: <SLUG>-<MAT>-<SIZE>.
UPDATE public.product_variants v
SET sku = upper(regexp_replace(p.slug, '[^a-zA-Z0-9]+', '-', 'g'))
          || '-' || (CASE v.material
                       WHEN 'brass' THEN 'BRASS'
                       WHEN 'stainless_steel' THEN 'STL'
                     END)
          || '-M'
FROM public.products p
WHERE v.product_id = p.id
  AND p.kind = 'charm'
  AND v.material IS NOT NULL;

-- Normalize the legacy charm variant names to the matrix display label
-- ("Stainless steel" → "Stainless Steel · Medium") so every charm row
-- reads identically in cart lines, order history, and emails.
UPDATE public.product_variants v
SET name = (CASE v.material
              WHEN 'brass' THEN 'Brass'
              WHEN 'stainless_steel' THEN 'Stainless Steel'
            END)
         || ' · ' || (CASE v.size
                        WHEN 'small' THEN 'Small'
                        WHEN 'medium' THEN 'Medium'
                        ELSE 'Large'
                      END)
FROM public.products p
WHERE v.product_id = p.id
  AND p.kind = 'charm'
  AND v.material IS NOT NULL
  AND v.name NOT LIKE '%·%';

-- ------------------------------------------------------------
-- 4. Uniqueness: one row per (product, material[, size]) combo.
--    Race-safe upserts from the admin matrix editor target these.
-- ------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS product_variants_charm_combo_key
  ON public.product_variants (product_id, material, size)
  WHERE material IS NOT NULL AND size IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS product_variants_jewelry_material_key
  ON public.product_variants (product_id, material)
  WHERE material IS NOT NULL AND size IS NULL;

-- ------------------------------------------------------------
-- 5. Generate the missing charm matrix cells (6 per charm).
--    Existing rows survive via ON CONFLICT DO NOTHING; new cells
--    start at 0 stock and are immediately sellable once stocked.
-- ------------------------------------------------------------
INSERT INTO public.product_variants
  (product_id, name, sku, price_adjustment, stock_quantity, is_active, material, size)
SELECT
  p.id,
  m.label || ' · ' || s.label,
  upper(regexp_replace(p.slug, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || m.code || '-' || s.code,
  CASE WHEN m.value = 'stainless_steel' THEN 25.00 ELSE 0.00 END,
  0,
  true,
  m.value,
  s.value
FROM public.products p
CROSS JOIN (VALUES
  ('brass',          'Brass',           'BRASS'),
  ('stainless_steel','Stainless Steel', 'STL')
) AS m(value, label, code)
CROSS JOIN (VALUES
  ('small',  'Small',  'S'),
  ('medium', 'Medium', 'M'),
  ('large',  'Large',  'L')
) AS s(value, label, code)
WHERE p.kind = 'charm'
ON CONFLICT (product_id, material, size) WHERE material IS NOT NULL AND size IS NOT NULL
DO NOTHING;
