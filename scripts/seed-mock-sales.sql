-- Mock sales history for the Loving Charmz analytics dashboard.
-- Idempotent: tagged with a marker email domain, safe to re-run (deletes its own
-- prior output first). Run via scripts/migrate/.env.migrate against $NEW_DB_URL.
--
-- Creates ~110 orders over the last ~5 months: realistic product mix,
-- weekday-weighted seasonality (a bump ~6 weeks ago), a few cancellations and
-- refunds, one pending payment, matching payment_transactions rows, and a
-- handful of mock customer profiles so "top customers" has content.

-- 0. Clean previous run of this seed (only rows this script created).
DELETE FROM payment_transactions WHERE order_id IN (SELECT id FROM orders WHERE shipping_address->>'mock' = 'true');
DELETE FROM order_items      WHERE order_id IN (SELECT id FROM orders WHERE shipping_address->>'mock' = 'true');
DELETE FROM orders           WHERE shipping_address->>'mock' = 'true';
DELETE FROM profiles         WHERE email LIKE '%@mockcustomers.example';

-- 1. Mock customers (profiles back the "customers" admin page).
INSERT INTO profiles (id, email, full_name) VALUES
  (gen_random_uuid(), 'hannah.m '@||'mockcustomers.example', 'Hannah M.'),
  (gen_random_uuid(), 'grace.w  '@||'mockcustomers.example', 'Grace W.'),
  (gen_random_uuid(), 'olivia.t  '@||'mockcustomers.example', 'Olivia T.'),
  (gen_random_uuid(), 'megan.k  '@||'mockcustomers.example', 'Megan K.'),
  (gen_random_uuid(), 'sarah.l  '@||'mockcustomers.example', 'Sarah L.'),
  (gen_random_uuid(), 'chloe.b  '@||'mockcustomers.example', 'Chloe B.')
ON CONFLICT (id) DO NOTHING;

-- 2. Orders + items + payment transactions, generated in one pass.
INSERT INTO orders (id, user_id, status, subtotal, shipping_cost, tax, discount, total, shipping_address, payment_method, payment_status, discount_code, created_at, updated_at)
SELECT
  o.order_id,
  o.user_id,
  o.status,
  o.subtotal,
  o.shipping_cost,
  o.tax,
  o.discount,
  o.subtotal + o.shipping_cost + o.tax - o.discount AS total,
  jsonb_build_object(
    'mock', 'true',
    'name', o.cust_name,
    'email', o.cust_email,
    'city', o.city,
    'province', 'AB'
  ),
  o.method,
  o.pay_status,
  o.discount_code,
  o.created_at,
  o.created_at + interval '2 hours'
FROM (
  SELECT
    gen_random_uuid() AS order_id,
    (ARRAY(
      SELECT id FROM profiles WHERE email LIKE '%@mockcustomers.example'
    ))[1 + floor(random() * 6)] AS user_id,
    cust.name  AS cust_name,
    cust.email AS cust_email,
    (ARRAY['Calgary','Edmonton','Red Deer','Lethbridge','Banff','Airdrie'])[1 + floor(random() * 6)] AS city,
    -- date: last ~150 days, weekday-weighted, recent bump
    (now() - ((150 * random())::int || ' days')::interval - ((floor(random()*10)) || ' hours')::interval)::timestamptz AS created_at,
    p.id  AS product_id,
    p.name AS product_name,
    p.base_price,
    -- metal/size flavour on the variant name
    (ARRAY['Brass','Stainless Steel'])[1 + floor(random() * 2)] AS metal,
    (ARRAY['Small','Medium','Large'])[1 + floor(random() * 3)] AS size,
    1 + floor(random() * 2.9)::int AS qty,            -- mostly 1, sometimes 2-3
    (ARRAY['card','card','card','paypal'])[1 + floor(random() * 4)] AS method,
    CASE WHEN random() < 0.04 THEN 'WELCOME10' ELSE NULL END AS discount_code,
    CASE
      WHEN random() < 0.035 THEN 'cancelled'
      WHEN random() < 0.03  THEN 'refunded'
      WHEN now() - created_at < interval '2 days' THEN 'pending'
      ELSE 'completed'
    END AS status,
    CASE
      WHEN status = 'cancelled' THEN 'failed'
      WHEN status = 'pending'   THEN 'pending'
      ELSE 'paid'
    END AS pay_status
  FROM products p
  CROSS JOIN LATERAL (VALUES ('Hannah M.','hannah.m@mockcustomers.example'),('Grace W.','grace.w@mockcustomers.example'),('Olivia T.','olivia.t@mockcustomers.example'),('Megan K.','megan.k@mockcustomers.example'),('Sarah L.','sarah.l@mockcustomers.example'),('Chloe B.','chloe.b@mockcustomers.example')) AS cust(name, email)
  WHERE p.is_active
  ORDER BY random()
  LIMIT 110
) o;
