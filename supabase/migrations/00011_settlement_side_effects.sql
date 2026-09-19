-- Settlement side effects.
--
-- Two things must happen exactly once when money actually moves:
--   1. the discount code on the order counts against its `max_uses` limit
--   2. variant stock is decremented by the ordered quantities
--
-- Both used to be missing entirely: `current_uses` was validated at checkout
-- but never incremented, and stock was never touched by checkout at all.
--
-- `apply_order_settlement_effects` is called by `markPaymentConfirmed` in
-- `lib/payments/ledger.ts`. The `order_settlements` guard row makes it
-- idempotent: webhooks, return routes and retries may all settle the same
-- order, but the side effects run only for the first caller — the second
-- blocks on the primary-key insert and sees no row returned.

create table if not exists public.order_settlements (
  order_id uuid primary key references public.orders (id) on delete cascade,
  settled_at timestamptz not null default now()
);

alter table public.order_settlements enable row level security;

-- No policies: only the security-definer function below and the service_role
-- client (which bypasses RLS) ever touch this table.

create or replace function public.apply_order_settlement_effects(p_order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted uuid;
  v_code text;
  v_discount_id uuid;
  v_current int;
  v_max int;
begin
  if p_order_id is null then
    return false;
  end if;

  insert into public.order_settlements (order_id)
  values (p_order_id)
  on conflict (order_id) do nothing
  returning order_id into v_inserted;

  -- Another caller (webhook racing the return route) already applied them.
  if v_inserted is null then
    return false;
  end if;

  -- Decrement stock for every ordered variant. Clamped at zero so a variant
  -- that sold out between checkout and settlement cannot go negative.
  update public.product_variants v
     set stock_quantity = greatest(0, v.stock_quantity - oi.quantity),
         updated_at = now()
    from public.order_items oi
   where oi.order_id = p_order_id
     and oi.variant_id = v.id;

  -- Count the order's discount code against its usage limit. The code was
  -- validated at checkout; if it filled up in the meantime we still keep the
  -- paid order but stop the counter at max_uses.
  select o.discount_code into v_code from public.orders o where o.id = p_order_id;

  if v_code is not null and length(btrim(v_code)) > 0 then
    select d.id, d.current_uses, d.max_uses
      into v_discount_id, v_current, v_max
      from public.discounts d
     where upper(d.code) = upper(btrim(v_code))
       for update;

    if v_discount_id is not null and (v_max is null or v_current < v_max) then
      update public.discounts
         set current_uses = current_uses + 1,
             updated_at = now()
       where id = v_discount_id;
    end if;
  end if;

  return true;
end;
$$;

revoke execute on function public.apply_order_settlement_effects(uuid) from public, anon, authenticated;
grant execute on function public.apply_order_settlement_effects(uuid) to service_role;
