import Link from 'next/link';
import Image from 'next/image';
import { Container } from '@/components/ui/Container';
import { getProducts } from '@/lib/supabase/queries/products';
import { getCollections } from '@/lib/supabase/queries/collections';
import { images } from '@/lib/images';

export const metadata = {
  title: 'Shop - Loving Charmz',
  description: 'Browse our collection of symbolic pet-bond jewelry.',
};

export default async function ShopPage() {
  const [products, collections] = await Promise.all([
    getProducts(),
    getCollections(),
  ]);

  return (
    <Container className="py-12">
      <div className="text-center mb-12">
        <span className="badge-gold inline-flex items-center">The Collection</span>
        <h1 className="font-display text-4xl sm:text-5xl font-semibold text-obsidian-50 mt-4 mb-4">
          Every piece tells a story
        </h1>
        <p className="text-obsidian-400 max-w-xl mx-auto">
          Symbolic jewelry designed to honor the bond you share with your pet. 
          Each piece is crafted with care, ready to carry your memories close.
        </p>
      </div>

      {collections.length > 0 && (
        <div className="flex flex-wrap gap-3 justify-center mb-10">
          <Link
            href="/shop"
            className="px-5 py-2 rounded-pill bg-gold-500 text-obsidian-950 text-sm font-medium"
          >
            All Pieces
          </Link>
          {collections.map((collection) => (
            <Link
              key={collection.id}
              href={`/collections/${collection.slug}`}
              className="px-5 py-2 rounded-pill border border-obsidian-700 text-obsidian-300 text-sm font-medium hover:border-gold-500 hover:text-gold-500 transition-all"
            >
              {collection.name}
            </Link>
          ))}
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.map((product, index) => {
          const imageIndex = index % images.shop.length;
          const productImage = images.shop[imageIndex];
          return (
            <Link
              key={product.id}
              href={`/products/${product.slug}`}
              className="group"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <article className="surface-premium rounded-card overflow-hidden border border-obsidian-700/50 hover-lift">
                <div className="aspect-square relative overflow-hidden">
                  <Image
                    src={productImage}
                    alt={product.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-obsidian-900/60 to-transparent" />
                  {product.is_personalizable && (
                    <span className="absolute top-3 right-3 badge-gold text-xs">
                      Personalizable
                    </span>
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
          );
        })}
      </div>

      {products.length === 0 && (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">✨</div>
          <h2 className="font-display text-2xl text-obsidian-50 mb-2">Coming Soon</h2>
          <p className="text-obsidian-400">Our collection is being curated with care.</p>
        </div>
      )}
    </Container>
  );
}