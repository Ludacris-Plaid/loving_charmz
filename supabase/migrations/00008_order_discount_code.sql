-- Remember which discount code was applied to an order.
--
-- The orders table already stores the discount amount (`discount`), but not
-- the code that produced it, so neither the shopper nor the admin could see
-- which promotion an order used. The column is nullable and backfills to NULL:
-- orders placed before discount codes existed simply have no code.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS discount_code TEXT;
