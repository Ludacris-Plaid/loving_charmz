-- Canada Post shipping integration (00018).
--
-- One row per generated label. Keeps everything needed to re-download a
-- label, void a spoiled one, and (contract mode) transmit shipments into a
-- manifest: Canada Post's own links stay valid for ~90 days, so they are
-- stored verbatim in `links` rather than reconstructed.
--
-- The order keeps its legacy tracking_number/tracking_carrier columns — the
-- PIN (tracking number) is copied there on label creation so every existing
-- flow (ship email, customer account page, history export) keeps working.

CREATE TABLE IF NOT EXISTS public.cp_shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  mode text NOT NULL DEFAULT 'non-contract',   -- non-contract | contract
  service_code text NOT NULL,                  -- DOM.EP, DOM.RP, ...
  pin text,                                    -- tracking number assigned by Canada Post
  group_id text,                               -- contract mode: manifest grouping
  links jsonb NOT NULL DEFAULT '{}'::jsonb,    -- self / label / details hrefs from CP
  price jsonb,                                 -- quoted price details when returned
  status text NOT NULL DEFAULT 'created',      -- created | voided | transmitted
  manifest_link text,                          -- contract mode: manifest href after transmit
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cp_shipments_order_id_idx ON public.cp_shipments (order_id);
CREATE INDEX IF NOT EXISTS cp_shipments_status_idx ON public.cp_shipments (status);

ALTER TABLE public.cp_shipments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage cp_shipments" ON public.cp_shipments;
CREATE POLICY "Admins manage cp_shipments"
  ON public.cp_shipments
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- The application writes through the service-role client (bypasses RLS);
-- the policy above keeps the table admin-only for direct authenticated use.
