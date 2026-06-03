import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { Input } from '@/components/ui/Input';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { CustomOrderForm } from '@/components/shop/CustomOrderForm';
import { getSession } from '@/components/admin/AdminGuard';
import { getProducts } from '@/lib/supabase/queries/products';
import { images } from '@/lib/images';

export const metadata = {
  title: 'Custom Orders — Loving Charmz',
  description: 'Create a personalized keepsake that tells your unique story.',
};

const options = [
  {
    title: 'Name Engraving',
    body: 'Add your pet’s name, a meaningful date, or a short phrase — engraved on the piece you choose.',
  },
  {
    title: 'Charm Selection',
    body: 'Choose from our curated charm library to layer symbols of your bond onto a bracelet or necklace.',
  },
  {
    title: 'Reference Inspiration',
    body: 'Share a photo, a sketch, or a feeling. We will translate it into a design proposal for you to approve.',
  },
];

export default async function CustomOrdersPage() {
  const [session, products] = await Promise.all([
    getSession(),
    getProducts(20).catch(() => []),
  ]);

  return (
    <div className="relative overflow-hidden">
      <div className="blob-mint -top-32 -left-32 h-96 w-96" aria-hidden />
      <div className="blob-plum bottom-32 -right-32 h-96 w-96" aria-hidden />

      <Container className="relative py-12 sm:py-16">
        <div className="text-center max-w-3xl mx-auto">
          <span className="badge-mint">Custom Creations</span>
          <h1 className="font-display text-4xl sm:text-5xl font-semibold leading-[1.1] tracking-tight mt-6">
            <span className="block">
              <span className="hero-word hero-word-1 text-plum-900">Your</span>{' '}
              <span className="hero-word hero-word-2 text-plum-900">story,</span>
            </span>
            <span className="block mt-1">
              <span className="hero-word hero-word-3 text-plum-900">crafted</span>{' '}
              <span className="hero-word hero-word-4 text-plum-900">into</span>
            </span>
            <span className="block mt-1">
              <span className="hero-word hero-word-5 text-plum-900">something</span>{' '}
              <span className="hero-word hero-word-6 text-plum-900">lasting</span>
            </span>
          </h1>
          <div className="hero-content">
            <p className="mt-6 text-ink-600 text-lg leading-relaxed">
              Every pet bond is unique. Our custom order process lets you create a piece that carries your story — a name engraving, a specific charm, or a design inspired by your pet.
            </p>
          </div>
        </div>

        <ScrollReveal delay={150}>
          <div className="mt-12 grid sm:grid-cols-3 gap-6">
            {options.map((o) => (
              <div key={o.title} className="surface-card inner-highlight p-6 hover-lift">
                <span className="badge-plum mb-3">Step</span>
                <h3 className="font-display text-lg font-semibold text-plum-900 mt-2 mb-2">{o.title}</h3>
                <p className="text-sm text-ink-600 leading-relaxed">{o.body}</p>
              </div>
            ))}
          </div>
        </ScrollReveal>

        <ScrollReveal delay={220}>
          <div className="mt-12 surface-card inner-highlight p-8 sm:p-10 max-w-2xl mx-auto">
            <h2 className="font-display text-2xl font-semibold text-plum-900 mb-2">
              Start your custom order
            </h2>
            <p className="text-sm text-ink-600 mb-6">
              Tell us about your keepsake — the more detail you share, the more personal the result.
            </p>

            {session ? (
              <CustomOrderForm products={products.map((p) => ({ id: p.id, name: p.name }))} />
            ) : (
              <div className="space-y-4 text-center">
                <p className="text-ink-700">
                  Sign in to submit a custom order request. We will keep you updated on the status from your account.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Link href="/login?next=/custom-orders" className="btn-plum px-6 py-2.5 text-sm">
                    Sign in
                  </Link>
                  <Link href="/signup?next=/custom-orders" className="btn-outline px-6 py-2.5 text-sm">
                    Create an account
                  </Link>
                </div>
              </div>
            )}

            <div className="mt-8 pt-6 border-t border-cream-300 text-center text-sm text-ink-500">
              Prefer email? Write to{' '}
              <a href="mailto:hello@lovingcharmz.com" className="font-medium text-plum-700 hover:text-plum-900 motion-base">
                hello@lovingcharmz.com
              </a>
              .
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={280}>
          <div className="mt-16 max-w-3xl mx-auto">
            <h2 className="font-display text-2xl font-semibold text-plum-900 text-center mb-8">
              Inspiration from the Bond Collection
            </h2>
            <div className="grid grid-cols-3 gap-4">
              {images.shop.slice(0, 3).map((src, i) => (
                <div
                  key={i}
                  className="aspect-square overflow-hidden rounded-card border border-cream-300"
                  aria-hidden
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>
      </Container>
    </div>
  );
}
