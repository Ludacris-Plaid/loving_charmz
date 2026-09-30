-- ============================================================
-- 00021 — One price, set by the admin
--
-- Pricing rule: the price entered on the product form is THE price, for
-- every material and size. Variant rows no longer modify it.
--
--   1. zeroes every price_adjustment (they were +$25 stainless-steel
--      upgrades and assorted legacy values), which makes the price the
--      shopper sees match the price the admin entered, and
--   2. updates the live homepage ticker, whose hard-coded message still
--      advertised the removed free-shipping-over-$50 promotion.
-- ============================================================

update public.product_variants set price_adjustment = 0 where price_adjustment <> 0;

update public.content_blocks
   set metadata = jsonb_set(
         metadata,
         '{messages}',
         '["Handcrafted pet-bond keepsakes · Shipped across Canada with Canada Post"]'::jsonb
       )
 where slug = 'ticker';
