import Link from 'next/link';
import Image from 'next/image';
import { Container } from '@/components/ui/Container';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { getCollections } from '@/lib/supabase/queries/collections';
import { images } from '@/lib/images';

import { MagneticWrap } from '@/components/ui/MagneticWrap';

export const metadata = {
  title: 'Collections — Loving Charmz',
  description: 'Browse our jewelry collections.',
};

export default async function CollectionsPage() {
  const collections = await getCollections().catch(() => []);

  return (
    <Container className="py-12 sm:py-16">
      <div className="text-center mb-12">
        <span className="badge-mint">Collections</span>
        <h1 className="font-display text-4xl sm:text-5xl font-semibold leading-[1.1] tracking-tight mt-6">
          <span className="block">
            <span className="hero-word hero-word-1 text-plum-900">Our</span>{' '}
            <span className="hero-word hero-word-2 text-plum-900">collections</span>
          </span>
        </h1>
        <div className="hero-content">
          <p className="mt-6 max-w-xl mx-auto text-ink-600">
            Each collection tells a unique story. Explore our curated groups of pieces designed to honor your bond.
          </p>
        </div>
      </div>

      {collections.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2">
          {collections.map((collection, index) => (
            <ScrollReveal key={collection.id} delay={Math.min(index * 100, 300)}>
              <Link href={`/collections/${collection.slug}`} className="group block">
                <article className="surface-card inner-highlight overflow-hidden hover-lift">
                  <div className="relative aspect-[2/1] overflow-hidden">
                    <Image
                      src={collection.image_url || images.shop[index % images.shop.length]}
                      alt={collection.name}
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-cover motion-base group-hover:scale-105"
                    />
                  </div>
                  <div className="p-6">
                    <h2 className="font-display text-2xl font-semibold text-plum-900 group-hover:text-plum-700 motion-base">
                      {collection.name}
                    </h2>
                    {collection.description && (
                      <p className="mt-2 text-ink-600">{collection.description}</p>
                    )}
                  </div>
                </article>
              </Link>
            </ScrollReveal>
          ))}
        </div>
      ) : (
        <ScrollReveal delay={120}>
          <div className="text-center py-16 surface-soft">
            <span className="badge-mint mb-3">New collections on the way</span>
          </div>
        </ScrollReveal>
      )}

      {collections.length > 0 && (
        <ScrollReveal delay={200}>
          <div className="mt-12 text-center">
            <MagneticWrap strength={6}>
              <Link href="/shop" className="btn-plum px-8 py-3 text-sm">
                Browse all pieces
              </Link>
            </MagneticWrap>
          </div>
        </ScrollReveal>
      )}
    </Container>
  );
}
