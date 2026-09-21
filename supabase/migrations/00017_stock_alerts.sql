-- ============================================================
-- 00017 — Low-stock alerts for the shop owner
--
-- A trigger on product_variants queues an alert whenever any
-- variant's stock lands exactly on zero (the "sold out" edge —
-- clamped there by settlement or set by the admin). The app
-- drains the queue and emails the owner a daily digest, then
-- deletes the drained rows. Restocks (0 -> n) clear the flag so
-- a re-emptied variant alerts again; each dip to zero queues at
-- most one alert until restocked.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.stock_alerts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id  UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL,
  variant_name TEXT NOT NULL,
  product_name TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS stock_alerts_variant_idx
  ON public.stock_alerts (variant_id);

REVOKE ALL ON public.stock_alerts FROM anon, authenticated;

-- ------------------------------------------------------------
-- Trigger: queue an alert the moment stock hits zero
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_variant_out_of_stock()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Restock clears the pending-alert state for the variant.
  IF NEW.stock_quantity > 0 THEN
    DELETE FROM public.stock_alerts WHERE variant_id = NEW.id;
    RETURN NEW;
  END IF;

  -- Stock landed on zero: queue one alert unless one is already pending.
  IF NEW.stock_quantity = 0 THEN
    INSERT INTO public.stock_alerts (variant_id, product_id, variant_name, product_name)
    SELECT NEW.id, NEW.product_id, NEW.name, p.name
    FROM public.products p
    WHERE p.id = NEW.product_id
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- The "one alert until restocked" guarantee needs a uniqueness anchor for
-- ON CONFLICT; a partial unique index on variant_id serves it.
CREATE UNIQUE INDEX IF NOT EXISTS stock_alerts_variant_pending_key
  ON public.stock_alerts (variant_id);

DROP TRIGGER IF EXISTS stock_alert_trigger ON public.product_variants;
CREATE TRIGGER stock_alert_trigger
AFTER UPDATE OF stock_quantity ON public.product_variants
FOR EACH ROW
EXECUTE FUNCTION public.notify_variant_out_of_stock();
