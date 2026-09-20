-- ============================================================
-- 00014 — Public variant visibility for the material × size matrix
--
-- The old policy hid any variant with stock_quantity = 0 from the public.
-- With one variant per product that quietly "removed" sold-out items, but
-- with a 6-cell charm matrix it hides whole options: a customer browsing
-- Companion Charm would never see that Brass or other sizes exist.
--
-- Stock communication now belongs to the UI (per-combination "out of stock"
-- state), not to row hiding. This policy shows every ACTIVE variant of an
-- ACTIVE product to everyone; inactive rows/products stay admin-only.
-- ============================================================

DROP POLICY IF EXISTS "Anyone can view variants with stock" ON public.product_variants;

CREATE POLICY "Anyone can view active variants"
  ON public.product_variants FOR SELECT
  USING (
    public.is_admin()
    OR (
      is_active
      AND EXISTS (
        SELECT 1 FROM public.products p
        WHERE p.id = product_variants.product_id
          AND p.is_active
      )
    )
  );
