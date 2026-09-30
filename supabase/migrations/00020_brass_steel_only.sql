-- ============================================================
-- 00020 — Brass & Stainless Steel only
--
-- The shop sells charms in brass / stainless steel × S/M/L. Nothing else.
-- This migration:
--   1. sets every product to kind = 'charm' (four had drifted to 'jewelry',
--      leaving a mixed variant shape no code path understood),
--   2. deletes the legacy material-only rows (size IS NULL) the old jewelry
--      bootstrap created — all were zero-stock and unreferenced,
--   3. deletes any sterling silver / 14K gold / rose gold rows (none existed
--      in live data; kept here so re-runs and other environments converge),
--   4. re-enables any variant left inactive by the old flows,
--   5. tightens the material CHECK to the two real metals.
--
-- order_items / cart_items reference variants ON DELETE SET NULL, so
-- deletion is history-safe: past orders keep their names and totals.
-- ============================================================

-- 1. One kind for the whole catalog: the charm matrix.
update public.products set kind = 'charm' where kind <> 'charm';

-- 2. Legacy jewelry-shape rows: no size, never sellable through the matrix.
delete from public.product_variants where size is null;

-- 3. Precious-metal rows from the original seed scripts (defensive: none in
--    live data, but older environments may still carry them).
delete from public.product_variants
where material in ('sterling_silver', 'gold_14k', 'rose_gold');

-- 4. The matrix editor is the only stock surface; the old flows had
--    deactivated rows with no way back. Every charm cell is sellable again.
update public.product_variants set is_active = true where not is_active;

-- 5. The material vocabulary shrinks to what the shop actually stocks.
alter table public.product_variants drop constraint if exists product_variants_material_check;
alter table public.product_variants add constraint product_variants_material_check
  check (material in ('brass', 'stainless_steel'));
