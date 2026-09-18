-- One-off cleanup: my mock seeder used status='completed', which is not part of
-- the app's order-status vocabulary (pending/processing/shipped/delivered/
-- cancelled/refunded). 'delivered' is the correct terminal state for a paid,
-- finished order. Remap; the marker guard keeps this scoped to seeded rows.
UPDATE orders
SET status = 'delivered'
WHERE shipping_address->>'mock' = 'true'
  AND status = 'completed';
