import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { JsonLd } from '@/components/ui/JsonLd';
import { createClient } from '@/lib/supabase/server';
import { getProductBySlug } from '@/lib/supabase/queries/products';
import { getCartCount } from '@/lib/cart/server';
import ProductDetailClient from '@/components/shop/ProductDetailClient';
import { images } from '@/lib/images';
import { SITE_URL } from '@/lib/site';

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: 'Product Not Found' };
  return {
    title: `${product.name} — Loving Charmz`,
    description: product.description || product.tagline || '',
    openGraph: {
      title: product.name,
      description: product.description || product.tagline || '',
      url: `${SITE_URL}/products/${slug}`,
      images: product.images?.[0] ? [{ url: product.images[0], width: 800, height: 800 }] : [],
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

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

  // Product + Offer structured data for Google rich results
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description || product.tagline || '',
    image: imageUrl,
    url: `${SITE_URL}/products/${slug}`,
    brand: {
      '@type': 'Brand',
      name: 'Loving Charmz',
    },
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'CAD',
      lowPrice: product.base_price,
      highPrice: Math.max(product.base_price, ...((variantsData || []).map(v => product.base_price + Number(v.price_adjustment || 0)))),
      availability: 'https://schema.org/InStock',
      url: `${SITE_URL}/products/${slug}`,
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
