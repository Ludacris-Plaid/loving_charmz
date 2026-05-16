import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { getCollectionBySlug, getCollectionProducts } from '@/lib/supabase/queries/collections';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const collection = await getCollectionBySlug(slug);
  if (!collection) return { title: 'Collection Not Found' };
  return {
    title: `${collection.name} - Loving Charmz`,
    description: collection.description || '',
  };
}

export default async function CollectionPage({ params }: Props) {
  const { slug } = await params;
  const collection = await getCollectionBySlug(slug);
  
  if (!collection) {
    notFound();
  }

  const productsData = await getCollectionProducts(slug);
  const products = productsData?.map((p: any) => p.products) || [];

  return (
    <Container className="py-12">
      <nav className="text-sm text-obsidian-500 mb-8">
        <Link href="/collections" className="hover:text-gold-500 transition-colors">Collections</Link>
        <span className="mx-2">/</span>
        <span className="text-obsidian-300">{collection.name}</span>
      </nav>

      <div className="text-center mb-12">
        <h1 className="font-display text-4xl sm:text-5xl font-semibold text-obsidian-50 mb-4">
          {collection.name}
        </h1>
        {collection.description && (
          <p className="text-obsidian-400 max-w-xl mx-auto">{collection.description}</p>
        )}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.map((product: any, index: number) => (
          <Link
            key={product.id}
            href={`/products/${product.slug}`}
            className="group"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <article className="surface-premium rounded-card overflow-hidden border border-obsidian-700/50 hover-lift">
              <div className="aspect-square bg-gradient-to-br from-obsidian-800 to-obsidian-900 flex items-center justify-center relative">
                <div className="text-6xl">{product.images?.[0]}</div>
                <div className="absolute inset-0 bg-gradient-to-t from-obsidian-900/60 to-transparent" />
                {product.is_personalizable && (
                  <span className="absolute top-3 right-3 badge-gold text-xs">Personalizable</span>
                )}
              </div>
              <div className="p-5">
                <p className="text-xs font-medium uppercase tracking-wider text-gold-500 mb-1">
                  {product.tagline}
                </p>
                <h3 className="font-display text-lg font-semibold text-obsidian-50 mb-2 group-hover:text-gold-400 transition-colors">
                  {product.name}
                </h3>
                <p className="text-obsidian-400 text-sm">
                  From <span className="text-gold-400 font-medium">${product.base_price}</span>
                </p>
              </div>
            </article>
          </Link>
        ))}
      </div>

      {products.length === 0 && (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">💎</div>
          <h2 className="font-display text-2xl text-obsidian-50 mb-2">Coming Soon</h2>
          <p className="text-obsidian-400">No products in this collection yet.</p>
        </div>
      )}
    </Container>
  );
}