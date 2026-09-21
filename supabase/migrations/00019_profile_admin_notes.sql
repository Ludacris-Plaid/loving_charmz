-- Private admin notes on customers (00019, revised).
--
-- Notes live in their OWN table rather than a column on profiles: profiles
-- RLS grants users UPDATE on their own row, so a notes column there could be
-- rewritten or erased by the customer through direct API access, and future
-- `select(*)` reads would serve it back to them. A table with NO policies
-- for anon/authenticated is invisible to customers by construction — only
-- the service-role client (admin actions) can touch it.

CREATE TABLE IF NOT EXISTS public.customer_admin_notes (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  notes text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_admin_notes ENABLE ROW LEVEL SECURITY;

-- Intentionally NO policies: RLS denies anon/authenticated by default.
-- The application reads/writes through the service-role client only.

-- Keep updated_at fresh on every edit (upserts update in place).
CREATE OR REPLACE FUNCTION public.touch_customer_admin_notes()
RETURNS trigger LANGUAGE plpgsql AS $$
begin
  new.updated_at = now();
  return new;
end $$;

DROP TRIGGER IF EXISTS customer_admin_notes_touch ON public.customer_admin_notes;
CREATE TRIGGER customer_admin_notes_touch
  BEFORE UPDATE ON public.customer_admin_notes
  FOR EACH ROW EXECUTE FUNCTION public.touch_customer_admin_notes();

ALTER TABLE public.profiles DROP COLUMN IF EXISTS admin_notes;
