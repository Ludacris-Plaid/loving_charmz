-- ============================================================
-- 00022 — Give the paw-prints product a URL-safe slug
--
-- "Forever Paw prints" was stored with a space in its slug, so its public
-- URL was /products/forever pawprints. That is a broken-looking link to
-- anyone reading it, an invalid <loc> in sitemap.xml (a raw space is not
-- legal in a URL), and a slug search engines are entitled to read as two
-- separate words. Every other product in the catalog already uses the
-- house style — lowercase alphanumerics, no separators — so this brings
-- the last one in line.
--
-- The product page resolves any reasonable spelling of a slug and 308s to
-- the real one, so /products/forever%20pawprints and /products/forever-paw-prints
-- keep working and simply redirect here.
-- ============================================================

update public.products
   set slug = 'foreverpawprints'
 where slug = 'forever pawprints';
