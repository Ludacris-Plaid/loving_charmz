import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { createClient } from '@/lib/supabase/server';
import { getProductBySlug } from '@/lib/supabase/queries/products';
import { getCartCount } from '@/lib/cart/server';
import ProductDetailClient from '@/components/shop/ProductDetailClient';
import { images } from '@/lib/images';

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

  const allImages = images.shop;
  const imageUrl = allImages[(product.name.length + product.id.length) % allImages.length];

  return (
    <ProductDetailClient
      product={product}
      variants={variantsData || []}
      imageUrl={imageUrl}
      initialCartCount={cartCount}
      isLoggedIn={Boolean(user)}
    />
  );
}
