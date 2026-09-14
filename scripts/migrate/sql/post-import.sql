-- Loving Charmz — post-import reconciliation (NEW project only).
-- Runs immediately after the data load. Idempotent.

-- 1. The auth.users INSERTs fired handle_new_user, which creates a profile with
--    a fallback username. The real profile rows were imported afterwards, but
--    any user missing from the dump would still have only the placeholder.
--    Backfill anything still absent so no account is profile-less.
insert into public.profiles (id, username)
select u.id, coalesce(u.raw_user_meta_data->>'username', 'user_' || substr(u.id::text, 1, 8))
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;

-- 2. Keep the "first user is the admin" bootstrap guarantee even when the
--    imported role rows are empty (e.g. a catalog-only load).
insert into public.user_roles (user_id, role)
select id, 'admin' from (
  select u.id from auth.users u
  where not exists (select 1 from public.user_roles r where r.role = 'admin')
  order by u.created_at asc
  limit 1
) first_user
on conflict (user_id, role) do nothing;

-- 3. Fresh planner statistics after a bulk load. Bare `analyze` would also
--    walk the system catalogs (noisy permission warnings) — scope it to public.
do $$
declare
  t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('analyze public.%I', t);
  end loop;
end $$;

-- 4. Tell PostgREST to pick up the new schema/policies immediately.
notify pgrst, 'reload schema';

select 'post-import' as step,
       (select count(*) from auth.users) as users,
       (select count(*) from public.profiles) as profiles,
       (select count(*) from public.user_roles where role = 'admin') as admins,
       (select count(*) from public.orders) as orders,
       (select count(*) from public.products) as products;
