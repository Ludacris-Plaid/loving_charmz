-- Fix infinite RLS recursion on user_roles
-- All admin policies previously used inline subqueries on user_roles,
-- which triggered user_roles' own recursive policy.
-- Solution: SECURITY DEFINER function bypasses RLS to check admin status.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin');
$$;

-- user_roles — users can see their own role; no more self-referencing subquery
DROP POLICY IF EXISTS "Admins can read roles" ON public.user_roles;
CREATE POLICY "Users can read own role"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- products
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
CREATE POLICY "Admins can manage products"
  ON public.products FOR ALL
  USING (public.is_admin());

-- collections
DROP POLICY IF EXISTS "Admins can manage collections" ON public.collections;
CREATE POLICY "Admins can manage collections"
  ON public.collections FOR ALL
  USING (public.is_admin());

-- collection_products
DROP POLICY IF EXISTS "Admins can manage collection products" ON public.collection_products;
CREATE POLICY "Admins can manage collection products"
  ON public.collection_products FOR ALL
  USING (public.is_admin());

-- product_variants
DROP POLICY IF EXISTS "Anyone can view variants with stock" ON public.product_variants;
DROP POLICY IF EXISTS "Admins can manage variants" ON public.product_variants;
CREATE POLICY "Anyone can view variants with stock"
  ON public.product_variants FOR SELECT
  USING (stock_quantity > 0 OR public.is_admin());
CREATE POLICY "Admins can manage variants"
  ON public.product_variants FOR ALL
  USING (public.is_admin());

-- orders
DROP POLICY IF EXISTS "Admins can manage all orders" ON public.orders;
CREATE POLICY "Admins can manage all orders"
  ON public.orders FOR ALL
  USING (public.is_admin());

-- order_items
DROP POLICY IF EXISTS "Admins can manage all order items" ON public.order_items;
CREATE POLICY "Admins can manage all order items"
  ON public.order_items FOR ALL
  USING (public.is_admin());

-- personalization_requests
DROP POLICY IF EXISTS "Admins can manage all requests" ON public.personalization_requests;
CREATE POLICY "Admins can manage all requests"
  ON public.personalization_requests FOR ALL
  USING (public.is_admin());

-- discounts
DROP POLICY IF EXISTS "Admins can manage discounts" ON public.discounts;
CREATE POLICY "Admins can manage discounts"
  ON public.discounts FOR ALL
  USING (public.is_admin());

-- content_blocks
DROP POLICY IF EXISTS "Admins can manage content" ON public.content_blocks;
CREATE POLICY "Admins can manage content"
  ON public.content_blocks FOR ALL
  USING (public.is_admin());

-- payment_transactions
DROP POLICY IF EXISTS "Admins can view all transactions" ON public.payment_transactions;
CREATE POLICY "Admins can view all transactions"
  ON public.payment_transactions FOR SELECT
  USING (public.is_admin());

-- analytics_annotations (from 00005)
DROP POLICY IF EXISTS "Admins can read annotations" ON public.analytics_annotations;
DROP POLICY IF EXISTS "Admins can manage annotations" ON public.analytics_annotations;
CREATE POLICY "Admins can read annotations"
  ON public.analytics_annotations FOR SELECT
  USING (public.is_admin());
CREATE POLICY "Admins can manage annotations"
  ON public.analytics_annotations FOR ALL
  USING (public.is_admin());
