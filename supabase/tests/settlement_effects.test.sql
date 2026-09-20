-- Integration tests for `public.apply_order_settlement_effects` (migration 00011).
--
-- The suite is self-contained: every test builds its own product/variant/order
-- fixtures, so it runs against any database that has the migrations applied —
-- a disposable Supabase branch in CI (scripts/test-branch.sh), or the live
-- project, because the entire run is wrapped in ONE transaction that is always
-- rolled back at the end. Nothing is left behind either way.
--
-- Run:
--   psql "$DB_URL" -X -v ON_ERROR_STOP=1 -f supabase/tests/settlement_effects.test.sql
--
-- Any failed assertion RAISEs an exception, which aborts the transaction and
-- makes psql exit non-zero (ON_ERROR_STOP). Success prints one line per test.

begin;

-- Show each assertion's `ok:` line in psql output (CI logs).
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

-- Unique per run so the suite never collides with a real code, even if a
-- rollback ever failed to fire.
create temp table _c on commit drop as select md5(random()::text) as code;

-- ============================================================================
-- 1. Settlement decrements stock and counts the discount code exactly once
-- ============================================================================
do $$
declare
  v_product uuid; v_order uuid; v_variant uuid;
  v_stock int; v_uses int;
begin
  insert into products (name, slug, base_price, is_active)
  values ('Settle Test 1', 'settle-test-1-' || (select code from _c), 50, true)
  returning id into v_product;

  insert into product_variants (product_id, name, stock_quantity, is_active)
  values (v_product, 'Standard', 10, true)
  returning id into v_variant;

  insert into discounts (id, code, discount_type, discount_value, max_uses, current_uses, is_active)
  values (gen_random_uuid(), upper((select code from _c)), 'percentage', 10, 100, 0, true);

  insert into orders (id, status, subtotal, total, payment_status, discount_code)
  values (gen_random_uuid(), 'pending', 50, 45, 'paid', (select code from _c))
  returning id into v_order;

  insert into order_items (order_id, product_id, variant_id, product_name, unit_price, quantity)
  values (v_order, v_product, v_variant, 'Settle Test 1', 50, 3);

  perform pg_temp.assert_eq(public.apply_order_settlement_effects(v_order), true, 'first settlement returns true');
  perform pg_temp.assert_eq(public.apply_order_settlement_effects(v_order), false, 'second settlement of same order returns false');

  select stock_quantity into v_stock from product_variants where id = v_variant;
  perform pg_temp.assert_eq(v_stock, 7, 'stock decremented by ordered quantity');

  select current_uses into v_uses from discounts where code = upper((select code from _c));
  perform pg_temp.assert_eq(v_uses, 1, 'discount current_uses counted once');
end;
$$;

-- ============================================================================
-- 2. Stock clamps at zero instead of going negative
-- ============================================================================
do $$
declare
  v_product uuid; v_order uuid; v_variant uuid; v_stock int;
begin
  insert into products (name, slug, base_price, is_active)
  values ('Settle Test 2', 'settle-test-2-' || (select code from _c), 20, true)
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

  select stock_quantity into v_stock from product_variants where id = v_variant;
  perform pg_temp.assert_eq(v_stock, 0, 'stock clamped at zero, not negative');
end;
$$;

-- ============================================================================
-- 3. Discount usage never exceeds max_uses
-- ============================================================================
do $$
declare
  v_product uuid; v_order uuid; v_variant uuid; v_uses int; v_code text;
begin
  v_code := upper((select code from _c)) || 'B';
  insert into products (name, slug, base_price, is_active)
  values ('Settle Test 3', 'settle-test-3-' || (select code from _c), 30, true)
  returning id into v_product;

  insert into product_variants (product_id, name, stock_quantity, is_active)
  values (v_product, 'Standard', 50, true)
  returning id into v_variant;

  insert into discounts (id, code, discount_type, discount_value, max_uses, current_uses, is_active)
  values (gen_random_uuid(), v_code, 'percentage', 10, 5, 5, true);

  insert into orders (id, status, subtotal, total, payment_status, discount_code)
  values (gen_random_uuid(), 'pending', 30, 27, 'paid', v_code)
  returning id into v_order;

  insert into order_items (order_id, product_id, variant_id, product_name, unit_price, quantity)
  values (v_order, v_product, v_variant, 'Settle Test 3', 30, 1);

  perform pg_temp.assert_eq(public.apply_order_settlement_effects(v_order), true, 'capped settlement returns true');

  select current_uses into v_uses from discounts where code = v_code;
  perform pg_temp.assert_eq(v_uses, 5, 'current_uses stops at max_uses');
end;
$$;

-- ============================================================================
-- 4. NULL order id is a harmless no-op
-- ============================================================================
do $$
begin
  perform pg_temp.assert_eq(public.apply_order_settlement_effects(null), false, 'null order id returns false');
end;
$$;

-- ============================================================================
-- 5. Unknown discount codes (never validated) do not block settlement
-- ============================================================================
do $$
declare
  v_product uuid; v_order uuid; v_variant uuid; v_uses int;
begin
  insert into products (name, slug, base_price, is_active)
  values ('Settle Test 5', 'settle-test-5-' || (select code from _c), 15, true)
  returning id into v_product;

  insert into product_variants (product_id, name, stock_quantity, is_active)
  values (v_product, 'Standard', 50, true)
  returning id into v_variant;

  insert into discounts (id, code, discount_type, discount_value, max_uses, current_uses, is_active)
  values (gen_random_uuid(), 'UNRELATED-' || (select code from _c), 'percentage', 10, 10, 0, true);

  insert into orders (id, status, subtotal, total, payment_status, discount_code)
  values (gen_random_uuid(), 'pending', 15, 15, 'paid', 'GHOST-' || (select code from _c))
  returning id into v_order;

  insert into order_items (order_id, product_id, variant_id, product_name, unit_price, quantity)
  values (v_order, v_product, v_variant, 'Settle Test 5', 15, 1);

  perform pg_temp.assert_eq(public.apply_order_settlement_effects(v_order), true, 'unknown code still settles');

  select current_uses into v_uses from discounts where code = 'UNRELATED-' || (select code from _c);
  perform pg_temp.assert_eq(v_uses, 0, 'unrelated discount untouched');
end;
$$;

-- ============================================================================
-- 6. Code matching is case/space-insensitive on lookup (documents behaviour)
-- ============================================================================
do $$
declare
  v_product uuid; v_order uuid; v_variant uuid; v_uses int; v_code text;
begin
  v_code := '  ' || (select code from _c) || 'six  '; -- padded + lowercase on the order
  insert into products (name, slug, base_price, is_active)
  values ('Settle Test 6', 'settle-test-6-' || (select code from _c), 12, true)
  returning id into v_product;

  insert into product_variants (product_id, name, stock_quantity, is_active)
  values (v_product, 'Standard', 50, true)
  returning id into v_variant;

  insert into discounts (id, code, discount_type, discount_value, max_uses, current_uses, is_active)
  values (gen_random_uuid(), upper((select code from _c)) || 'SIX', 'percentage', 10, 10, 0, true);

  insert into orders (id, status, subtotal, total, payment_status, discount_code)
  values (gen_random_uuid(), 'pending', 12, 11, 'paid', v_code)
  returning id into v_order;

  insert into order_items (order_id, product_id, variant_id, product_name, unit_price, quantity)
  values (v_order, v_product, v_variant, 'Settle Test 6', 12, 1);

  perform pg_temp.assert_eq(public.apply_order_settlement_effects(v_order), true, 'padded/lowercase code settles');

  select current_uses into v_uses from discounts where code = upper((select code from _c)) || 'SIX';
  perform pg_temp.assert_eq(v_uses, 1, 'code counted despite case/whitespace');
end;
$$;

-- ============================================================================
-- 7. Every ordered variant is decremented, each exactly once
-- ============================================================================
do $$
declare
  v_product uuid; v_order uuid; v_a uuid; v_b uuid;
  v_stock_a int; v_stock_b int;
begin
  insert into products (name, slug, base_price, is_active)
  values ('Settle Test 7', 'settle-test-7-' || (select code from _c), 40, true)
  returning id into v_product;

  insert into product_variants (product_id, name, stock_quantity, is_active)
  values (v_product, 'Small', 20, true) returning id into v_a;
  insert into product_variants (product_id, name, stock_quantity, is_active)
  values (v_product, 'Large', 8, true) returning id into v_b;

  insert into orders (id, status, subtotal, total, payment_status)
  values (gen_random_uuid(), 'pending', 80, 80, 'paid')
  returning id into v_order;

  insert into order_items (order_id, product_id, variant_id, product_name, unit_price, quantity)
  select v_order, v_product, v_a, 'Small', 40, 2
  union all
  select v_order, v_product, v_b, 'Large', 40, 5;

  perform pg_temp.assert_eq(public.apply_order_settlement_effects(v_order), true, 'multi-variant settlement returns true');

  select stock_quantity into v_stock_a from product_variants where id = v_a;
  select stock_quantity into v_stock_b from product_variants where id = v_b;
  perform pg_temp.assert_eq(v_stock_a, 18, 'variant A decremented');
  perform pg_temp.assert_eq(v_stock_b, 3, 'variant B decremented');
end;
$$;

rollback;
