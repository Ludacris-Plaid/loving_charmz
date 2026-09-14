-- Loving Charmz — local rehearsal seed.
--
-- Representative rows for exercising the migration pipeline against the LOCAL
-- Supabase stack only. It creates fake accounts and fake storage URLs
-- (including the old project ref) so that export -> import -> URL rewrite can be
-- verified end to end.
--
--   psql "$LOCAL_DB_URL" -X -v ON_ERROR_STOP=1 -v allow_seed=yes \
--     -f scripts/migrate/sql/rehearsal-seed.sql
--
-- The -v allow_seed=yes opt-in is deliberate: this must never be run against a
-- cloud project.

\if :{?allow_seed}
\else
\echo 'Refusing to run: pass -v allow_seed=yes to confirm this is a local rehearsal database'
\quit
\endif

begin;

-- ---------------------------------------------------------------- accounts
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('d0000000-0000-4000-8000-00000000000a', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'admin@lovcharmz.test',
   crypt('rehearsal-password', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"username":"lc_admin"}',
   now() - interval '90 days', now()),
  ('d0000000-0000-4000-8000-00000000000b', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'customer@lovcharmz.test',
   crypt('rehearsal-password', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"username":"lc_customer"}',
   now() - interval '30 days', now())
on conflict (id) do nothing;

-- NOTE: auth.identities.email is a GENERATED column on current GoTrue, so it
-- must be omitted here. This is exactly the drift the migration's
-- column-intersection auth copy exists to survive.
insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values
  ('d0000000-0000-4000-8000-00000000000a', 'd0000000-0000-4000-8000-00000000000a',
   '{"sub":"d0000000-0000-4000-8000-00000000000a","email":"admin@lovcharmz.test"}'::jsonb,
   'email', now(), now(), now()),
  ('d0000000-0000-4000-8000-00000000000b', 'd0000000-0000-4000-8000-00000000000b',
   '{"sub":"d0000000-0000-4000-8000-00000000000b","email":"customer@lovcharmz.test"}'::jsonb,
   'email', now(), now(), now())
on conflict (provider_id, provider) do nothing;

-- The signup trigger already created placeholder profile rows; fill in the real
-- values (this is the state the import reconciliation has to survive).
update public.profiles
set display_name = 'Rehearsal Admin',
    is_public = false,
    avatar_url = 'https://otareqhvjbcbiehmgzda.supabase.co/storage/v1/object/public/avatars/d0000000-0000-4000-8000-00000000000a/avatar.png?t=1'
where id = 'd0000000-0000-4000-8000-00000000000a';

update public.profiles
set display_name = 'Rehearsal Customer',
    bio = 'Keepsake collector.',
    is_public = true
where id = 'd0000000-0000-4000-8000-00000000000b';

delete from public.user_roles
where user_id in ('d0000000-0000-4000-8000-00000000000a', 'd0000000-0000-4000-8000-00000000000b');
insert into public.user_roles (user_id, role)
values ('d0000000-0000-4000-8000-00000000000a', 'admin')
on conflict (user_id, role) do nothing;

-- ---------------------------------------------------------------- catalog
insert into public.collections (id, name, slug, description, image_url, is_active, sort_order)
values
  ('e0000000-0000-4000-8000-000000000001', 'Ethereal Essentials', 'ethereal-essentials',
   'Light, everyday keepsakes.', 'https://otareqhvjbcbiehmgzda.supabase.co/storage/v1/object/public/product-images/collections/ethereal.jpg', true, 1),
  ('e0000000-0000-4000-8000-000000000002', 'Moonlit Garden', 'moonlit-garden',
   'Botanical symbolism.', 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800&q=80', true, 2)
on conflict (id) do nothing;

insert into public.products (id, name, slug, description, tagline, base_price, images, is_active, is_personalizable)
values
  ('f0000000-0000-4000-8000-000000000001', 'Moonstone Paw Pendant', 'moonstone-paw-pendant',
   'A moonstone cabochon set in recycled sterling silver.', 'Best seller', 148.00,
   array[
     'https://otareqhvjbcbiehmgzda.supabase.co/storage/v1/object/public/product-images/products/moonstone-paw/primary.webp',
     'https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=600&q=80'
   ], true, true),
  ('f0000000-0000-4000-8000-000000000002', 'Golden Bond Bracelet', 'golden-bond-bracelet',
   'Hand-linked chain with an engraved tag.', 'New', 96.50,
   array['https://otareqhvjbcbiehmgzda.supabase.co/storage/v1/object/public/product-images/products/golden-bond/primary.jpg'],
   true, false),
  ('f0000000-0000-4000-8000-000000000003', 'Retired Charm Set', 'retired-charm-set',
   'Discontinued set kept for order history.', null, 40.00, array[]::text[], false, false)
on conflict (id) do nothing;

insert into public.collection_products (collection_id, product_id, sort_order)
values
  ('e0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001', 1),
  ('e0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000002', 2),
  ('e0000000-0000-4000-8000-000000000002', 'f0000000-0000-4000-8000-000000000003', 1)
on conflict do nothing;

insert into public.product_variants (id, product_id, name, sku, price_adjustment, stock_quantity, is_active)
values
  ('a1000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001', 'Sterling Silver', 'MOON-SS', 0, 12, true),
  ('a1000000-0000-4000-8000-000000000002', 'f0000000-0000-4000-8000-000000000001', '14k Gold Fill', 'MOON-GF', 60, 3, true),
  ('a1000000-0000-4000-8000-000000000003', 'f0000000-0000-4000-8000-000000000001', 'Rose Gold Fill', 'MOON-RG', 55, 0, true),
  ('a1000000-0000-4000-8000-000000000004', 'f0000000-0000-4000-8000-000000000002', '16cm', 'BOND-16', 0, 8, true)
on conflict (id) do nothing;

-- ---------------------------------------------------------------- commerce
insert into public.carts (id, user_id)
values ('a2000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-00000000000b')
on conflict (user_id) do nothing;

insert into public.cart_items (id, cart_id, product_id, variant_id, quantity)
values
  ('a3000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001',
   'f0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000002', 1)
on conflict (id) do nothing;

insert into public.orders (id, user_id, status, subtotal, shipping_cost, tax, discount, total,
                           shipping_address, payment_method, payment_status, created_at)
values
  ('a4000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-00000000000b',
   'delivered', 148.00, 0, 11.84, 0, 159.84,
   '{"firstName":"Rehearsal","lastName":"Customer","city":"Calgary","country":"CA"}'::jsonb,
   'paypal', 'paid', now() - interval '21 days'),
  ('a4000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-00000000000b',
   'pending', 96.50, 9.99, 7.72, 0, 114.21,
   '{"firstName":"Rehearsal","lastName":"Customer","city":"Calgary","country":"CA"}'::jsonb,
   'card', 'pending', now() - interval '2 days')
on conflict (id) do nothing;

insert into public.order_items (order_id, product_id, variant_id, product_name, variant_name, unit_price, quantity)
values
  ('a4000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001',
   'a1000000-0000-4000-8000-000000000001', 'Moonstone Paw Pendant', 'Sterling Silver', 148.00, 1),
  ('a4000000-0000-4000-8000-000000000002', 'f0000000-0000-4000-8000-000000000002',
   'a1000000-0000-4000-8000-000000000004', 'Golden Bond Bracelet', '16cm', 96.50, 1);

insert into public.payment_transactions (id, order_id, provider, provider_transaction_id, amount, currency, status)
values ('a5000000-0000-4000-8000-000000000001', 'a4000000-0000-4000-8000-000000000001',
        'paypal', 'REHEARSAL-TXN-1', 159.84, 'USD', 'succeeded')
on conflict (id) do nothing;

insert into public.wishlists (id, user_id, product_id)
values ('a6000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-00000000000b',
        'f0000000-0000-4000-8000-000000000002')
on conflict (user_id, product_id) do nothing;

insert into public.personalization_requests (id, user_id, product_id, pet_name, charm_selections,
                                             freeform_text, reference_image_url, status, admin_notes)
values ('a7000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-00000000000b',
        'f0000000-0000-4000-8000-000000000001', 'Luna',
        array['paw print', 'birthstone'], 'Her fur was the colour of moonlight.',
        'https://otareqhvjbcbiehmgzda.supabase.co/storage/v1/object/public/avatars/d0000000-0000-4000-8000-00000000000b/reference.png',
        'reviewing', 'Quoted in the Tuesday batch.')
on conflict (id) do nothing;

-- ---------------------------------------------------------------- content
insert into public.discounts (id, code, discount_type, discount_value, min_order_amount, max_uses, current_uses, is_active, expires_at)
values ('a8000000-0000-4000-8000-000000000001', 'REHEARSAL10', 'percentage', 10.00, 50.00, 100, 4, true, now() + interval '10 days')
on conflict (code) do nothing;

insert into public.content_blocks (id, slug, title, body, image_url, is_published)
values ('a9000000-0000-4000-8000-000000000001', 'about-hero', 'Our workshop',
        'Every piece is finished by hand in Calgary.',
        'https://otareqhvjbcbiehmgzda.supabase.co/storage/v1/object/public/product-images/content/workshop.jpg', true)
on conflict (slug) do nothing;

insert into public.analytics_annotations (id, annotation_date, title, body, color)
values ('aa000000-0000-4000-8000-000000000001', current_date - 7, 'Rehearsal note',
        'Seeded for the migration rehearsal.', 'plum')
on conflict (id) do nothing;

commit;

select 'seeded' as step,
       (select count(*) from auth.users) as users,
       (select count(*) from public.profiles) as profiles,
       (select count(*) from public.products) as products,
       (select count(*) from public.orders) as orders,
       (select count(*) from public.product_variants) as variants;
