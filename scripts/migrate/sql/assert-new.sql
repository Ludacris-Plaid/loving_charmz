-- Loving Charmz — new-project gates.
-- Run against the NEW project only. Any row whose status is FAIL must be fixed
-- before the cutover:
--   psql "$NEW_DB_URL" -X -At -F'|' -f scripts/migrate/sql/assert-new.sql

with checks as (
  -- ---------- migrations -------------------------------------------------
  -- supabase/migrations holds 6 files (00004 was never created); update this
  -- number when a migration is added.
  select 'migrations.applied' as gate,
         case when count(*) >= 6 then 'PASS' else 'FAIL' end as status,
         count(*)::text || ' of 6 recorded in supabase_migrations.schema_migrations' as detail
  from supabase_migrations.schema_migrations

  -- ---------- RLS coverage ----------------------------------------------
  union all select 'rls.enabled_on_all_public_tables',
    case when count(*) = 0 then 'PASS' else 'FAIL' end,
    count(*)::text || ' public tables without RLS'
  from pg_tables t
  join pg_class c on c.relname = t.tablename
  join pg_namespace n on n.oid = c.relnamespace and n.nspname = t.schemaname
  where t.schemaname = 'public' and c.relrowsecurity = false

  union all select 'rls.no_table_left_without_policies',
    case when count(*) = 0 then 'PASS' else 'FAIL' end,
    count(*)::text || ' public tables with RLS on but zero policies'
  from pg_tables t
  join pg_class c on c.relname = t.tablename
  join pg_namespace n on n.oid = c.relnamespace and n.nspname = t.schemaname
  where t.schemaname = 'public'
    and c.relrowsecurity = true
    and not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = t.tablename)

  -- ---------- the customer write paths that 00001-00006 were missing ------
  union all select 'policy.orders.insert_for_owner',
    case when exists (select 1 from pg_policies where schemaname='public' and tablename='orders' and cmd='INSERT') then 'PASS' else 'FAIL' end,
    'customers must be able to create their own orders'
  union all select 'policy.order_items.insert_for_owner',
    case when exists (select 1 from pg_policies where schemaname='public' and tablename='order_items' and cmd='INSERT') then 'PASS' else 'FAIL' end,
    'checkout writes order_items immediately after orders'
  union all select 'policy.personalization_requests.insert_for_owner',
    case when exists (select 1 from pg_policies where schemaname='public' and tablename='personalization_requests' and cmd='INSERT') then 'PASS' else 'FAIL' end,
    'custom order form submits as the signed-in customer'
  union all select 'policy.profiles.select_own_row',
    case when exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and cmd='SELECT'
                      and qual like '%auth.uid()%') then 'PASS' else 'FAIL' end,
    'a member who unticks "public" must still read their own profile'

  union all select 'policy.user_roles.no_open_insert',
    case when exists (
      select 1 from pg_policies
      where schemaname='public' and tablename='user_roles' and cmd in ('INSERT','ALL')
        and coalesce(with_check, '') = 'true'
    ) then 'FAIL' else 'PASS' end,
    'no self-promotion path into admin (00001 shipped WITH CHECK (true))'

  -- ---------- definer functions are search_path pinned -------------------
  union all select 'function.search_path_pinned',
    case when count(*) = 3 then 'PASS' else 'FAIL' end,
    count(*)::text || ' of 3 SECURITY DEFINER functions pin search_path'
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in ('is_admin', 'handle_new_user', 'promote_first_user_to_admin')
    and p.proconfig::text like '%search_path%'

  -- ---------- storage ----------------------------------------------------
  union all select 'storage.buckets_present',
    case when count(*) = 2 then 'PASS' else 'FAIL' end,
    count(*)::text || ' of 2 buckets (avatars, product-images)'
  from storage.buckets where id in ('avatars', 'product-images')

  union all select 'storage.objects_readable_per_bucket',
    case when
      exists (select 1 from pg_policies where schemaname='storage' and tablename='objects'
              and cmd='SELECT' and qual like '%avatars%')
      and exists (select 1 from pg_policies where schemaname='storage' and tablename='objects'
              and cmd='SELECT' and qual like '%product-images%')
    then 'PASS' else 'FAIL' end,
    'both buckets have a public read policy on storage.objects'

  -- ---------- auth/data integrity ---------------------------------------
  union all select 'auth.every_user_has_profile',
    case when count(*) = 0 then 'PASS' else 'FAIL' end,
    count(*)::text || ' auth users without a profile row'
  from auth.users u left join public.profiles p on p.id = u.id where p.id is null

  union all select 'auth.at_least_one_admin',
    case when count(*) >= 1 then 'PASS' else 'FAIL' end,
    count(*)::text || ' admin rows in user_roles'
  from public.user_roles where role = 'admin'

  union all select 'auth.identities_cover_users',
    case when count(*) = 0 then 'PASS' else 'FAIL' end,
    count(*)::text || ' auth users without an identity row (cannot sign in)'
  from auth.users u where not exists (select 1 from auth.identities i where i.user_id = u.id)

  union all select 'auth.password_hashes_present',
    case when count(*) = 0 then 'PASS' else 'FAIL' end,
    count(*)::text || ' auth users with no password hash (expected 0 for email/password accounts)'
  from auth.users where encrypted_password is null or encrypted_password = ''

  union all select 'data.stale_storage_urls',
    case when count(*) = 0 then 'PASS' else 'FAIL' end,
    count(*)::text || ' rows still pointing at the old project ref'
  from (
    select 1 from public.products where array_to_string(images, ',') like '%otareqhvjbcbiehmgzda%'
    union all select 1 from public.collections where image_url like '%otareqhvjbcbiehmgzda%'
    union all select 1 from public.content_blocks where image_url like '%otareqhvjbcbiehmgzda%'
    union all select 1 from public.profiles where avatar_url like '%otareqhvjbcbiehmgzda%'
    union all select 1 from public.personalization_requests where reference_image_url like '%otareqhvjbcbiehmgzda%'
  ) s

  union all select 'data.no_duplicate_carts',
    case when count(*) = 0 then 'PASS' else 'FAIL' end,
    count(*)::text || ' users with more than one cart'
  from (select user_id from public.carts group by user_id having count(*) > 1) d
)
select gate || '|' || status || '|' || detail from checks order by gate;
