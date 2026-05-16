import Link from 'next/link';
import Image from 'next/image';
import { Container } from '@/components/ui/Container';
import { getCollections } from '@/lib/supabase/queries/collections';
import { images } from '@/lib/images';

export const metadata = {
  title: 'Collections - Loving Charmz',
  description: 'Browse our jewelry collections.',
};

export default async function CollectionsPage() {
  const collections = await getCollections();

  return (
    <Container className="py-12">
      <div className="text-center mb-12">
        <span className="badge-gold inline-flex items-center">Collections</span>
        <h1 className="font-display text-4xl sm:text-5xl font-semibold text-obsidian-50 mt-6 mb-4">
          Our Collections
        </h1>
        <p className="text-obsidian-400 max-w-xl mx-auto">
          Each collection tells a unique story. Explore our curated groups of pieces designed to honor your bond.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {collections.map((collection, index) => {
          const imageIndex = index % images.shop.length;
          const collectionImage = images.shop[imageIndex];
          return (
            <Link
              key={collection.id}
              href={`/collections/${collection.slug}`}
              className="group"
            >
              <article className="surface-premium rounded-card overflow-hidden border border-obsidian-700/50 hover-lift">
                <div className="aspect-[2/1] relative overflow-hidden">
                  <Image
                    src={collectionImage}
                    alt={collection.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-obsidian-900/60 via-obsidian-900/30 to-transparent" />
                </div>
                <div className="p-6">
                  <h2 className="font-display text-2xl font-semibold text-obsidian-50 group-hover:text-gold-400 transition-colors">
                    {collection.name}
                  </h2>
                  <p className="text-obsidian-400 mt-2">{collection.description}</p>
                </div>
              </article>
            </Link>
          );
        })}
      </div>

      {collections.length === 0 && (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">💎</div>
          <h2 className="font-display text-2xl text-obsidian-50 mb-2">Coming Soon</h2>
          <p className="text-obsidian-400">New collections on the way.</p>
        </div>
      )}
    </Container>
  );
}