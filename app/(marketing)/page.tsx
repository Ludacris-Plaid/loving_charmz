import Link from 'next/link';
import Image from 'next/image';
import { Container } from '@/components/ui/Container';
import { MagneticWrap } from '@/components/ui/MagneticWrap';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { getProducts } from '@/lib/supabase/queries/products';
import { images } from '@/lib/images';

const highlights = [
  {
    title: 'Connection',
    description: 'Because they are not just pets. Each piece is made to hold the bond close.',
  },
  {
    title: 'Meaning',
    description: 'Symbols, names, and keepsakes that turn memories into something you can wear every day.',
  },
  {
    title: 'Permanence',
    description: 'Modern keepsake jewelry designed to stay with you through ordinary and milestone moments.',
  },
];

export const metadata = {
  title: 'Loving Charmz — Symbolic keepsake jewelry for the bond that lasts',
  description:
    'Handcrafted symbolic jewelry for women who carry what matters — love, memory, and the bond with the pets who shaped us.',
};

export default async function HomePage() {
  const products = await getProducts(8).catch(() => []);
  const featuredImage = images.pets.goldenRetriever;

  return (
    <div className="relative overflow-hidden">
      <div className="aurora" aria-hidden />
      <div className="blob-mint -top-40 -left-32 h-[28rem] w-[28rem]" aria-hidden />
      <div className="blob-plum top-60 -right-32 h-[24rem] w-[24rem]" aria-hidden />

      <Container className="relative py-20 sm:py-28 lg:py-32">
        <div className="space-y-24 sm:space-y-32">
          <section className="text-center relative">
            <span className="badge-mint mx-auto">Three collections · Eight keepsake pieces</span>

            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-semibold leading-[1.05] tracking-tight mt-8">
              <span className="block">
                <span className="hero-word hero-word-1 text-plum-900">Symbolic</span>{' '}
                <span className="hero-word hero-word-2 plum-gradient-text">jewelry</span>
              </span>
              <span className="block mt-2">
                <span className="hero-word hero-word-3 text-plum-900">for the</span>{' '}
                <span className="hero-word hero-word-4 text-plum-900">bond</span>
              </span>
              <span className="block mt-2">
                <span className="hero-word hero-word-5 text-ink-700">that</span>{' '}
                <span className="hero-word hero-word-6 plum-gradient-text">lasts</span>
              </span>
            </h1>

            <div className="hero-content mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
              <MagneticWrap strength={6}>
                <Link href="/collections" className="btn-plum px-8 py-3.5 text-sm">
                  Explore collections
                </Link>
              </MagneticWrap>
              <MagneticWrap strength={4}>
                <Link href="/shop" className="btn-outline px-8 py-3.5 text-sm">
                  Browse all pieces
                </Link>
              </MagneticWrap>
            </div>

            <p className="hero-content mt-8 text-center text-xs uppercase tracking-[0.3em] text-ink-500">
              3 collections · 8 pieces · Starting at $165
            </p>
          </section>

          <section className="featured-card relative max-w-5xl mx-auto">
            <div className="surface-card inner-highlight p-6 sm:p-10 lg:p-12 relative overflow-hidden">
              <div className="grid lg:grid-cols-2 gap-10 items-center relative z-10">
                <div className="space-y-4">
                  <span className="badge-plum">Featured keepsake</span>
                  <h2 className="section-title font-display text-3xl sm:text-4xl font-semibold text-plum-900">
                    The Loyal Companion
                  </h2>
                  <p className="text-ink-700 leading-relaxed">
                    Always by your side. Always in your heart. Designed for women who want something personal, subtle, and emotionally lasting — a tangible reminder of the bond you share.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="badge-soft">Warm bronze finish</span>
                    <span className="badge-soft">Made to stay with you</span>
                  </div>
                  <MagneticWrap strength={6}>
                    <Link href="/shop" className="inline-flex items-center gap-2 text-sm font-medium text-plum-700 hover:text-plum-900 motion-base">
                      View all pieces
                      <span aria-hidden>→</span>
                    </Link>
                  </MagneticWrap>
                </div>
                <div className="relative">
                  <div className="conic-ring" aria-hidden />
                  <div className="relative aspect-square overflow-hidden rounded-card border border-cream-300 clip-reveal-up">
                    <Image
                      src={featuredImage}
                      alt="A golden retriever, the inspiration for The Loyal Companion"
                      fill
                      sizes="(max-width: 1024px) 100vw, 50vw"
                      className="object-cover ken-burns"
                      priority
                    />
                  </div>
                  <div className="absolute -bottom-3 -right-3 badge-mint float-anim shadow-pop">Best seller</div>
                </div>
              </div>
            </div>
          </section>

          <section>
            <div className="grid sm:grid-cols-3 gap-6">
              {highlights.map((h, i) => (
                <ScrollReveal key={h.title} delay={i * 120}>
                  <article className="surface-card p-6 hover-lift h-full">
                    <span className="badge-plum mb-4">0{i + 1}</span>
                    <h3 className="font-display text-xl font-semibold text-plum-900 mb-2">{h.title}</h3>
                    <p className="text-sm text-ink-600 leading-relaxed">{h.description}</p>
                  </article>
                </ScrollReveal>
              ))}
            </div>
          </section>

          {products.length > 0 && (
            <section>
              <ScrollReveal>
                <div className="mb-8 flex flex-col items-center text-center">
                  <span className="badge-mint">The Collection</span>
                  <h2 className="font-display text-3xl sm:text-4xl font-semibold leading-[1.1] tracking-tight mt-4">
                    <span className="block">
                      <span className="hero-word hero-word-1 text-plum-900">Pieces</span>{' '}
                      <span className="hero-word hero-word-2 text-plum-900">to</span>{' '}
                      <span className="hero-word hero-word-3 text-plum-900">carry</span>{' '}
                      <span className="hero-word hero-word-4 text-plum-900">it</span>
                    </span>
                    <span className="block mt-1">
                      <span className="hero-word hero-word-5 text-plum-900">with</span>{' '}
                      <span className="hero-word hero-word-6 text-plum-900">you</span>
                    </span>
                  </h2>
                  <div className="hero-content mt-4">
                    <Link href="/shop" className="text-sm font-medium text-plum-700 hover:text-plum-900 motion-base">
                      See all →
                    </Link>
                  </div>
                </div>
              </ScrollReveal>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {products.slice(0, 4).map((product, i) => (
                  <ScrollReveal key={product.id} delay={i * 80}>
                    <Link
                      href={`/products/${product.slug}`}
                      className="group block surface-card overflow-hidden hover-lift h-full"
                    >
                      <div className="relative aspect-square overflow-hidden">
                        <Image
                          src={product.images?.[0] || images.shop[i % images.shop.length]}
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
                        <p className="mt-2 text-sm text-ink-600">From <span className="font-medium text-plum-700">${product.base_price}</span></p>
                      </div>
                    </Link>
                  </ScrollReveal>
                ))}
              </div>
            </section>
          )}

          <section className="surface-card p-8 sm:p-12 text-center max-w-3xl mx-auto relative overflow-hidden">
            <div className="absolute -top-20 -right-20 h-60 w-60 blob-mint opacity-30" aria-hidden />
            <div className="absolute -bottom-20 -left-20 h-60 w-60 blob-plum opacity-30" aria-hidden />
            <div className="relative z-10">
              <span className="badge-mint">Connection · Meaning · Permanence</span>
              <h2 className="section-title font-display text-3xl sm:text-4xl font-semibold text-plum-900 mt-4">
                Emotional warmth with <span className="plum-gradient-text">editorial precision</span>.
              </h2>
              <p className="mt-4 text-ink-600 max-w-xl mx-auto leading-relaxed">
                Every piece is designed to feel intimate and modern at once — soft enough for memory, refined enough for everyday wear, and calm in the way it moves.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                <MagneticWrap strength={6}>
                  <Link href="/stories" className="btn-outline px-6 py-2.5 text-sm">Read the stories</Link>
                </MagneticWrap>
                <MagneticWrap strength={4}>
                  <Link href="/about" className="btn-outline px-6 py-2.5 text-sm">About Loving Charmz</Link>
                </MagneticWrap>
              </div>
            </div>
          </section>

          <section className="text-center">
            <p className="text-sm text-ink-600">
              Ready to carry what matters?{' '}
              <Link href="/shop" className="font-medium text-plum-700 hover:text-plum-900 motion-base">
                Shop all pieces →
              </Link>
            </p>
          </section>
        </div>
      </Container>
    </div>
  );
}
