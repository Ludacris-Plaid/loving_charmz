import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { getProductBySlug } from '@/lib/supabase/queries/products';
import { getProducts } from '@/lib/supabase/queries/products';
import ProductDetailClient from '@/components/shop/ProductDetailClient';
import { images } from '@/lib/images';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: 'Product Not Found' };
  
  return {
    title: `${product.name} - Loving Charmz`,
    description: product.description || product.tagline || '',
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/product_variants?product_id=eq.${product.id}&is_active=eq.true&order=created_at`,
    {
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      },
    }
  );
  const variants = await response.json();

  // Get all products to find the index for image assignment
  const allProducts = await getProducts();
  const productIndex = allProducts.findIndex(p => p.id === product.id);
  const imageUrl = images.shop[productIndex % images.shop.length];

  return <ProductDetailClient product={product} variants={variants} imageUrl={imageUrl} />;
}