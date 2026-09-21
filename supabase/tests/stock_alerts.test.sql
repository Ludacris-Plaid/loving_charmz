-- Integration tests for the stock-alert trigger (migration 00017).
--
-- Same contract as settlement_effects.test.sql: self-contained fixtures, one
-- transaction, always rolled back. Any failed assertion RAISEs, psql exits
-- non-zero (ON_ERROR_STOP), nothing is left behind.
--
-- Run:
--   psql "$DB_URL" -X -v ON_ERROR_STOP=1 -f supabase/tests/stock_alerts.test.sql

begin;

set local client_min_messages = log;

create or replace function pg_temp.assert_eq(got anyelement, want anyelement, label text)
returns void
language plpgsql
as $$
begin
  if got is distinct from want then
    raise exception 'FAIL: % — got %, want %', label, got, want;
  end if;
  raise log 'ok: %', label;
end;
$$;

create temp table _c on commit drop as select md5(random()::text) as code;

-- ============================================================================
-- 1. Stock landing on zero queues exactly one alert
-- ============================================================================
do $$
declare
  v_product uuid; v_variant uuid; v_count int;
begin
  insert into products (name, slug, base_price, is_active)
  values ('Alert Test 1', 'alert-test-1-' || (select code from _c), 50, true)
  returning id into v_product;

  insert into product_variants (product_id, name, stock_quantity, is_active)
  values (v_product, 'Brass · Small', 1, true)
  returning id into v_variant;

  update product_variants set stock_quantity = 0 where id = v_variant;

  select count(*) into v_count from public.stock_alerts where variant_id = v_variant;
  perform pg_temp.assert_eq(v_count, 1, 'stock to zero queues one alert');

  -- A second update that keeps stock at zero must NOT queue a duplicate.
  update product_variants set stock_quantity = 0 where id = v_variant;
  select count(*) into v_count from public.stock_alerts where variant_id = v_variant;
  perform pg_temp.assert_eq(v_count, 1, 'repeated zero-stock update does not duplicate');
end;
$$;

-- ============================================================================
-- 2. Decrements that stop above zero queue nothing
-- ============================================================================
do $$
declare
  v_product uuid; v_variant uuid; v_count int;
begin
  insert into products (name, slug, base_price, is_active)
  values ('Alert Test 2', 'alert-test-2-' || (select code from _c), 50, true)
  returning id into v_product;

  insert into product_variants (product_id, name, stock_quantity, is_active)
  values (v_product, 'Stainless · Large', 10, true)
  returning id into v_variant;

  update product_variants set stock_quantity = 3 where id = v_variant;

  select count(*) into v_count from public.stock_alerts where variant_id = v_variant;
  perform pg_temp.assert_eq(v_count, 0, 'non-zero decrement queues no alert');
end;
$$;

-- ============================================================================
-- 3. Restock clears the pending alert; re-emptying alerts again
-- ============================================================================
do $$
declare
  v_product uuid; v_variant uuid; v_count int;
begin
  insert into products (name, slug, base_price, is_active)
  values ('Alert Test 3', 'alert-test-3-' || (select code from _c), 50, true)
  returning id into v_product;

  insert into product_variants (product_id, name, stock_quantity, is_active)
  values (v_product, 'Brass · Medium', 5, true)
  returning id into v_variant;

  update product_variants set stock_quantity = 0 where id = v_variant;
  select count(*) into v_count from public.stock_alerts where variant_id = v_variant;
  perform pg_temp.assert_eq(v_count, 1, 'first sellout queues alert');

  update product_variants set stock_quantity = 8 where id = v_variant;
  select count(*) into v_count from public.stock_alerts where variant_id = v_variant;
  perform pg_temp.assert_eq(v_count, 0, 'restock clears pending alert');

  update product_variants set stock_quantity = 0 where id = v_variant;
  select count(*) into v_count from public.stock_alerts where variant_id = v_variant;
  perform pg_temp.assert_eq(v_count, 1, 're-sellout after restock queues a fresh alert');
end;
$$;

-- ============================================================================
-- 4. Clamped settlement (order for more than stock) triggers the alert
-- ============================================================================
do $$
declare
  v_product uuid; v_variant uuid; v_order uuid; v_count int;
begin
  insert into products (name, slug, base_price, is_active)
  values ('Alert Test 4', 'alert-test-4-' || (select code from _c), 20, true)
  returning id into v_product;

  insert into product_variants (product_id, name, stock_quantity, is_active)
  values (v_product, 'Standard', 2, true)
  returning id into v_variant;

  insert into orders (id, status, subtotal, total, payment_status)
  values (gen_random_uuid(), 'pending', 20, 20, 'paid')
  returning id into v_order;

  insert into order_items (order_id, product_id, variant_id, product_name, unit_price, quantity)
  select v_order, p.id, v_variant, p.name, 20, 5
  from products p where p.id = v_product;

  perform pg_temp.assert_eq(public.apply_order_settlement_effects(v_order), true, 'clamp settlement returns true');

  select stock_quantity into v_count from product_variants where id = v_variant;
  perform pg_temp.assert_eq(v_count, 0, 'stock clamped to zero by settlement');

  select count(*) into v_count from public.stock_alerts where variant_id = v_variant;
  perform pg_temp.assert_eq(v_count, 1, 'settlement-driven sellout queues the alert');
end;
$$;

rollback;
