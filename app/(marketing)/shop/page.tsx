import Link from 'next/link';
import Image from 'next/image';
import { Container } from '@/components/ui/Container';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { getProducts } from '@/lib/supabase/queries/products';
import { getCollections } from '@/lib/supabase/queries/collections';
import { images } from '@/lib/images';

export const metadata = {
  title: 'Shop — Loving Charmz',
  description: 'Browse our collection of symbolic pet-bond jewelry.',
};

export default async function ShopPage() {
  const [products, collections] = await Promise.all([
    getProducts().catch(() => []),
    getCollections().catch(() => []),
  ]);

  return (
    <Container className="py-12 sm:py-16">
      <ScrollReveal>
        <div className="text-center mb-12">
          <h1 className="section-title font-display text-4xl sm:text-5xl font-semibold text-plum-900">
            Every piece tells a story
          </h1>
          <span className="badge-mint mt-4">The Collection</span>
          <p className="mt-4 max-w-xl mx-auto text-ink-600">
            Symbolic jewelry designed to honor the bond you share with your pet. Each piece is crafted with care, ready to carry your memories close.
          </p>
        </div>
      </ScrollReveal>

      {collections.length > 0 && (
        <ScrollReveal delay={120}>
          <div className="mb-10 flex flex-wrap items-center justify-center gap-2">
            <Link
              href="/shop"
              className="rounded-pill bg-plum-700 px-4 py-2 text-xs font-medium text-cream-50"
            >
              All Pieces
            </Link>
            {collections.map((collection) => (
              <Link
                key={collection.id}
                href={`/collections/${collection.slug}`}
                className="motion-base rounded-pill border border-cream-300 bg-surface px-4 py-2 text-xs font-medium text-ink-700 hover:border-plum-500 hover:text-plum-700"
              >
                {collection.name}
              </Link>
            ))}
          </div>
        </ScrollReveal>
      )}

      {products.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product, index) => (
            <ScrollReveal key={product.id} delay={Math.min(index * 70, 420)}>
              <Link
                href={`/products/${product.slug}`}
                className="group block"
              >
                <article className="surface-card inner-highlight overflow-hidden hover-lift">
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
                    {product.tagline && (
                      <p className="text-xs font-medium uppercase tracking-wider text-plum-600 mb-1">{product.tagline}</p>
                    )}
                    <h3 className="font-display text-lg font-semibold text-plum-900 group-hover:text-plum-700 motion-base">
                      {product.name}
                    </h3>
                    <p className="mt-2 text-sm text-ink-600">
                      From <span className="font-medium text-plum-700">${product.base_price}</span>
                    </p>
                  </div>
                </article>
              </Link>
            </ScrollReveal>
          ))}
        </div>
      ) : (
        <ScrollReveal delay={120}>
          <div className="text-center py-20 surface-soft">
            <span className="badge-mint mb-4">Coming soon</span>
            <h2 className="font-display text-2xl text-plum-900 mt-2">Our collection is being curated with care</h2>
            <p className="mt-2 text-ink-600">In the meantime, reach out about a custom keepsake.</p>
            <Link href="/custom-orders" className="btn-outline mt-6 px-6 py-2.5 text-sm">
              Start a custom order
            </Link>
          </div>
        </ScrollReveal>
      )}
    </Container>
  );
}
