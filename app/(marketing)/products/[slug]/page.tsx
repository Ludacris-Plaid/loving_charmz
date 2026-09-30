import { notFound, permanentRedirect } from 'next/navigation';
import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { JsonLd } from '@/components/ui/JsonLd';
import { createClient } from '@/lib/supabase/server';
import { getProductByAnySlug } from '@/lib/supabase/queries/products';
import { encodeSlug } from '@/lib/shop/slug';
import { getCartCount } from '@/lib/cart/server';
import ProductDetailClient from '@/components/shop/ProductDetailClient';
import { images } from '@/lib/images';
import { SITE_URL } from '@/lib/site';

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const product = await getProductByAnySlug(slug);
  if (!product) return { title: 'Product Not Found' };
  // Always the product's own slug, never the requested one: a request for a
  // legacy spelling must not advertise that spelling to search engines.
  const url = `${SITE_URL}/products/${encodeSlug(product.slug)}`;
  return {
    title: `${product.name} — Loving Charmz`,
    description: product.description || product.tagline || '',
    alternates: { canonical: url },
    openGraph: {
      title: product.name,
      description: product.description || product.tagline || '',
      url,
      images: product.images?.[0] ? [{ url: product.images[0], width: 800, height: 800 }] : [],
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProductByAnySlug(slug);
  if (!product) notFound();

  // The URL asked for is not the product's real slug (a legacy link, a
  // hand-typed variant, a stray %20). Send the visitor — and the crawler —
  // to the one true URL, so the old address keeps working and never becomes
  // a second indexable page for the same product. The canonical link below
  // points at the real slug either way.
  //
  // Note this is a *soft* redirect: resolving the product is an await, so the
  // response has already begun streaming by the time we get here and Next
  // cannot set a 308 status. It emits a meta-refresh plus a client-side
  // `NEXT_REDIRECT` carrying 308 instead, and the HTTP response is 200.
  // That is enough for a legacy link to land in the right place with no
  // duplicate content; only a middleware-level lookup before streaming
  // begins would produce a true 308, at the cost of a database round trip on
  // every product request.
  if (product.slug !== slug) {
    permanentRedirect(`/products/${encodeSlug(product.slug)}`);
  }

  const supabase = await createClient();
  const [{ data: variantsData }, { data: { user } }, cartCount] = await Promise.all([
    supabase
      .from('product_variants')
      .select('*')
      .eq('product_id', product.id)
      .eq('is_active', true)
      .order('created_at'),
    supabase.auth.getUser(),
    getCartCount(),
  ]);

  const imageUrl = product.images?.[0] || images.shop[(product.name.length + product.id.length) % images.shop.length];
  const canonicalUrl = `${SITE_URL}/products/${encodeSlug(product.slug)}`;

  // Prices of the sellable versions, for the structured-data range.
  const versionPrices = (variantsData || [])
    .filter((v: any) => v.is_active)
    .map((v: any) => Number(product.base_price) + Number(v.price_adjustment || 0));
  const lowestPrice = versionPrices.length ? Math.min(...versionPrices) : Number(product.base_price);
  const highestPrice = versionPrices.length ? Math.max(...versionPrices) : Number(product.base_price);

  // Product + Offer structured data for Google rich results
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description || product.tagline || '',
    image: imageUrl,
    url: canonicalUrl,
    brand: {
      '@type': 'Brand',
      name: 'Loving Charmz',
    },
    offers: {
      // Versions may carry their own price, so quote the real range: the
      // lowest price a shopper can pay up to the highest.
      '@type': 'AggregateOffer',
      priceCurrency: 'CAD',
      lowPrice: lowestPrice,
      highPrice: highestPrice,
      availability: 'https://schema.org/InStock',
      url: canonicalUrl,
    },
  };

  return (
    <>
      <JsonLd data={structuredData} />
      <ProductDetailClient
        product={product}
        variants={variantsData || []}
        imageUrl={imageUrl}
        initialCartCount={cartCount}
        isLoggedIn={Boolean(user)}
      />
    </>
  );
}
