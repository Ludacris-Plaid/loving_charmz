import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Container } from '@/components/ui/Container';
import { getCollectionBySlug, getCollectionProducts } from '@/lib/supabase/queries/collections';
import { images } from '@/lib/images';

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const collection = await getCollectionBySlug(slug);
  if (!collection) return { title: 'Collection Not Found' };
  return {
    title: `${collection.name} — Loving Charmz`,
    description: collection.description || '',
  };
}

export default async function CollectionPage({ params }: Props) {
  const { slug } = await params;
  const collection = await getCollectionBySlug(slug);
  if (!collection) notFound();

  const productsData = await getCollectionProducts(slug).catch(() => []);
  const products = productsData.map((p: any) => p.products).filter(Boolean);

  return (
    <Container className="py-12 sm:py-16">
      <nav className="mb-8 text-sm text-ink-500">
        <Link href="/collections" className="hover:text-plum-700 motion-base">Collections</Link>
        <span className="mx-2 text-ink-400">/</span>
        <span className="text-ink-700">{collection.name}</span>
      </nav>

      <div className="text-center mb-12">
        <span className="badge-mint">Collection</span>
        <h1 className="font-display text-4xl sm:text-5xl font-semibold text-plum-900 mt-4">
          {collection.name}
        </h1>
        {collection.description && (
          <p className="mt-4 max-w-xl mx-auto text-ink-600">{collection.description}</p>
        )}
      </div>

      {products.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product: any, index: number) => (
            <Link key={product.id} href={`/products/${product.slug}`} className="group block">
              <article className="surface-card overflow-hidden hover-lift">
                <div className="relative aspect-square overflow-hidden">
                  <Image
                    src={images.shop[index % images.shop.length]}
                    alt={product.name}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    className="object-cover motion-base group-hover:scale-105"
                  />
                  {product.is_personalizable && (
                    <span className="absolute right-3 top-3 badge-mint">Personalizable</span>
                  )}
                </div>
                <div className="p-5">
                  <h3 className="font-display text-lg font-semibold text-plum-900 group-hover:text-plum-700 motion-base">
                    {product.name}
                  </h3>
                  <p className="mt-2 text-sm text-ink-600">From <span className="font-medium text-plum-700">${product.base_price}</span></p>
                </div>
              </article>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 surface-soft">
          <span className="badge-mint mb-3">No products in this collection yet</span>
          <p className="text-ink-600 mt-2">Check back soon — the collection is growing.</p>
        </div>
      )}
    </Container>
  );
}
