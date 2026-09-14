-- Loving Charmz — data equality fingerprint.
-- Run against BOTH projects and diff the output:
--   psql "$OLD_DB_URL" -X -At -F'|' -f scripts/migrate/sql/verify.sql > old.txt
--   psql "$NEW_DB_URL" -X -At -F'|' -f scripts/migrate/sql/verify.sql > new.txt
--   diff -u old.txt new.txt
-- Every metric here must match on both sides. New-project-only gates live in
-- assert-new.sql so this diff stays meaningful.

with counts as (
  select 'auth.identities' as metric, count(*)::text as value from auth.identities
  union all select 'auth.users', count(*)::text from auth.users

  union all select 'public.profiles', count(*)::text from public.profiles
  union all select 'public.user_roles', count(*)::text from public.user_roles
  union all select 'public.user_roles.admins', count(*)::text from public.user_roles where role = 'admin'
  union all select 'public.collections', count(*)::text from public.collections
  union all select 'public.collection_products', count(*)::text from public.collection_products
  union all select 'public.products', count(*)::text from public.products
  union all select 'public.product_variants', count(*)::text from public.product_variants
  union all select 'public.carts', count(*)::text from public.carts
  union all select 'public.cart_items', count(*)::text from public.cart_items
  union all select 'public.orders', count(*)::text from public.orders
  union all select 'public.order_items', count(*)::text from public.order_items
  union all select 'public.wishlists', count(*)::text from public.wishlists
  union all select 'public.discounts', count(*)::text from public.discounts
  union all select 'public.content_blocks', count(*)::text from public.content_blocks
  union all select 'public.personalization_requests', count(*)::text from public.personalization_requests
  union all select 'public.payment_transactions', count(*)::text from public.payment_transactions
  union all select 'public.analytics_annotations', count(*)::text from public.analytics_annotations

  -- money/state integrity: these must survive the move exactly
  union all select 'integrity.orders.total_sum', coalesce(sum(total), 0)::numeric(14,2)::text from public.orders
  union all select 'integrity.orders.subtotal_sum', coalesce(sum(subtotal), 0)::numeric(14,2)::text from public.orders
  union all select 'integrity.orders.discount_sum', coalesce(sum(discount), 0)::numeric(14,2)::text from public.orders
  union all select 'integrity.order_items.units', coalesce(sum(quantity), 0)::text from public.order_items
  union all select 'integrity.variants.stock_sum', coalesce(sum(stock_quantity), 0)::text from public.product_variants

  -- referential sanity (must be zero on both sides)
  union all select 'orphans.cart_items', count(*)::text from public.cart_items ci
    left join public.carts c on c.id = ci.cart_id where c.id is null
  union all select 'orphans.order_items', count(*)::text from public.order_items oi
    left join public.orders o on o.id = oi.order_id where o.id is null
  union all select 'orphans.collection_products', count(*)::text from public.collection_products cp
    left join public.products p on p.id = cp.product_id where p.id is null
  union all select 'orphans.product_variants', count(*)::text from public.product_variants v
    left join public.products p on p.id = v.product_id where p.id is null
  union all select 'orphans.profiles', count(*)::text from public.profiles pr
    left join auth.users u on u.id = pr.id where u.id is null
  union all select 'orphans.orders.user_id', count(*)::text from public.orders o
    left join auth.users u on u.id = o.user_id where o.user_id is not null and u.id is null
  union all select 'dupes.carts_per_user', count(*)::text from (
    select user_id from public.carts group by user_id having count(*) > 1
  ) d

  -- NOTE: 'still pointing at the old storage host' is deliberately NOT part of
  -- this fingerprint — the rewrite step is supposed to change those values.
  -- New-project zero-ness is gated in assert-new.sql instead.
  union all select 'info.products.missing_images', count(*)::text from public.products
    where images is null or cardinality(images) = 0
  union all select 'info.orders.pending', count(*)::text from public.orders where status = 'pending'
)
select metric || '|' || value from counts order by metric;
