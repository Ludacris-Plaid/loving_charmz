-- Loving Charmz — RLS smoke test for the customer write paths.
--
-- Run against any project (local stack or cloud). Everything happens inside a
-- transaction that is rolled back, so no test user or order is ever persisted:
--
--   psql "$DB_URL" -X -v ON_ERROR_STOP=1 -f scripts/migrate/sql/rls-smoke.sql
--
-- Covers the gaps migration 00007 closed. Before 00007 the two inserts marked
-- "must succeed" fail with 42501, which is exactly what broke checkout.

\set ON_ERROR_STOP on

begin;

-- Two throwaway members, created as the table owner with triggers live.
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('aaaaaaaa-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'rls-a@example.test', 'x', now(),
   '{"provider":"email","providers":["email"]}', '{"username":"rls_a"}', now(), now()),
  ('bbbbbbbb-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'rls-b@example.test', 'x', now(),
   '{"provider":"email","providers":["email"]}', '{"username":"rls_b"}', now(), now())
on conflict (id) do nothing;

-- Deterministic starting state: neither user is an admin, neither profile is public.
delete from public.user_roles
where user_id in ('aaaaaaaa-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000002');
update public.profiles set is_public = false
where id in ('aaaaaaaa-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000002');

-- A order owned by user B, so user A has something to (not) touch.
insert into public.orders (id, user_id, status, subtotal, total, payment_status)
values ('cccccccc-0000-4000-8000-000000000003', 'bbbbbbbb-0000-4000-8000-000000000002',
        'pending', 25.00, 25.00, 'pending');

do $smoke$
declare
  u_a uuid := 'aaaaaaaa-0000-4000-8000-000000000001';
  u_b uuid := 'bbbbbbbb-0000-4000-8000-000000000002';
  order_b uuid := 'cccccccc-0000-4000-8000-000000000003';
  own_order uuid;
  visible int;
  touched int;
begin
  -- Act as user A for the rest of the transaction.
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', u_a, 'role', 'authenticated')::text, true);

  if auth.uid() <> u_a then
    raise exception 'FAIL setup: auth.uid() is %, expected %', auth.uid(), u_a;
  end if;

  -- 1. A member can create their own order (checkout) ----------------------
  insert into public.orders (user_id, status, subtotal, total, payment_status)
  values (u_a, 'pending', 42.00, 45.36, 'pending')
  returning id into own_order;
  raise notice 'PASS orders.insert_own';

  -- 2. ...but not one attributed to somebody else --------------------------
  begin
    insert into public.orders (user_id, status, subtotal, total)
    values (u_b, 'pending', 1.00, 1.00);
    raise exception 'FAIL orders.insert_for_other_user was allowed';
  exception when insufficient_privilege then
    raise notice 'PASS orders.insert_for_other_user blocked';
  end;

  -- 3. A member can add line items to their own order ---------------------
  insert into public.order_items (order_id, product_name, unit_price, quantity)
  values (own_order, 'Test keepsake', 42.00, 1);
  raise notice 'PASS order_items.insert_own';

  -- 4. ...but not to someone else's ---------------------------------------
  begin
    insert into public.order_items (order_id, product_name, unit_price, quantity)
    values (order_b, 'Injected line', 0.01, 1);
    raise exception 'FAIL order_items.insert_for_other_order was allowed';
  exception when insufficient_privilege then
    raise notice 'PASS order_items.insert_for_other_order blocked';
  end;

  -- 5. A member cannot rewrite another member's order status --------------
  update public.orders set status = 'delivered' where id = order_b;
  get diagnostics touched = row_count;
  if touched <> 0 then
    raise exception 'FAIL orders.update_for_other_user changed % row(s)', touched;
  end if;
  raise notice 'PASS orders.update_for_other_user blocked';

  -- 6. A member can submit a custom order ---------------------------------
  insert into public.personalization_requests (user_id, pet_name, freeform_text, status)
  values (u_a, 'Luna', 'A keepsake for my girl.', 'pending');
  raise notice 'PASS personalization_requests.insert_own';

  -- 7. ...but not on someone else's behalf --------------------------------
  begin
    insert into public.personalization_requests (user_id, pet_name, status)
    values (u_b, 'Not mine', 'pending');
    raise exception 'FAIL personalization_requests.insert_for_other_user was allowed';
  exception when insufficient_privilege then
    raise notice 'PASS personalization_requests.insert_for_other_user blocked';
  end;

  -- 8. A member with a private profile still sees their own row ----------
  -- Scoped to the caller's id so this holds on a populated project too.
  select count(*) into visible from public.profiles where id = u_a;
  if visible <> 1 then
    raise exception 'FAIL profiles.select_own_row returned % row(s), expected 1', visible;
  end if;
  raise notice 'PASS profiles.select_own_row';

  -- 9. ...and only their own row (other private profiles stay hidden) -----
  select count(*) into visible from public.profiles where id = u_b;
  if visible <> 0 then
    raise exception 'FAIL profiles.select_other_private_row leaked % row(s)', visible;
  end if;
  raise notice 'PASS profiles.select_other_private_row hidden';

  -- 10. A member must not be able to promote themselves to admin ----------
  begin
    insert into public.user_roles (user_id, role) values (u_a, 'admin');
    raise exception 'FAIL user_roles.self_promote was allowed';
  exception when insufficient_privilege then
    raise notice 'PASS user_roles.self_promote blocked';
  end;
end
$smoke$;

-- Never persists anything, even on success.
rollback;

select 'rls smoke complete (transaction rolled back)' as result;
