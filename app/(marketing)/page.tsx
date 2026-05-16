import Link from 'next/link';
import { Container } from '@/components/ui/Container';

const highlights = [
  {
    title: 'Connection',
    description: 'Because they are not just pets. Every piece is made to hold the bond close.',
    icon: '✦',
  },
  {
    title: 'Meaning',
    description: 'Symbols, names, and keepsakes that turn memories into something you can wear every day.',
    icon: '✦',
  },
  {
    title: 'Permanence',
    description: 'Modern keepsake jewelry designed to stay with you through ordinary and milestone moments.',
    icon: '✦',
  },
];

export default function HomePage() {
  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-gold-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-rose-gold-500/5 rounded-full blur-3xl" />
      </div>

      <Container className="py-12 sm:py-16 relative">
        <div className="space-y-16 sm:space-y-20">
          <section className="relative">
            <div className="text-center mb-12">
              <span className="badge-gold inline-flex items-center">Bond Collection — 4 pieces</span>
            </div>

            <div className="text-center max-w-4xl mx-auto">
              <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-semibold leading-tight">
                <span className="block mb-2">
                  <span className="hero-word hero-word-delay-1 text-obsidian-100">Modern</span>{' '}
                  <span className="hero-word hero-word-delay-2 gold-gradient-text">keepsake</span>
                </span>
                <span className="block mb-2">
                  <span className="hero-word hero-word-delay-3 text-obsidian-100">jewelry</span>
                </span>
                <span className="block">
                  <span className="hero-word hero-word-delay-4 text-obsidian-300">for women who</span>{' '}
                  <span className="hero-word hero-word-delay-5 gold-gradient-text">carry</span>
                </span>
                <span className="hero-word hero-word-delay-5 gold-gradient-text">what matters.</span>
              </h1>
            </div>

            <div className="hero-content mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/shop"
                className="btn-gold px-8 py-4 rounded-pill text-sm font-semibold tracking-wide uppercase"
              >
                Shop the Bond Collection
              </Link>
              <Link
                href="/custom-orders"
                className="btn-outline-gold px-8 py-4 rounded-pill text-sm font-semibold tracking-wide uppercase"
              >
                Create a custom keepsake
              </Link>
            </div>

            <p className="hero-content mt-8 text-center text-obsidian-400 text-sm tracking-[0.2em] uppercase">
              4 pieces · Each designed to represent connection · Starting at $55
            </p>
          </section>

          <section className="featured-card surface-premium rounded-card p-6 sm:p-8 lg:p-10 max-w-5xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.3em] text-gold-500 mb-4">Featured keepsake</p>
                <h2 className="font-display text-3xl sm:text-4xl font-semibold text-obsidian-50 mb-4">
                  The Loyal Companion
                </h2>
                <p className="text-obsidian-300 leading-relaxed mb-6">
                  Always by your side. Always in your heart. Designed for women who want something personal, subtle,
                  and emotionally lasting — a tangible reminder of the bond you share.
                </p>
                <div className="flex flex-wrap gap-3">
                  <span className="px-4 py-2 rounded-pill border border-gold-500/20 text-gold-400 text-xs uppercase tracking-wider">
                    Warm bronze finish
                  </span>
                  <span className="px-4 py-2 rounded-pill border border-gold-500/20 text-gold-400 text-xs uppercase tracking-wider">
                    Made to stay with you
                  </span>
                </div>
              </div>
              <div className="relative">
                <div className="aspect-square rounded-card bg-gradient-to-br from-obsidian-800 to-obsidian-900 flex items-center justify-center border border-obsidian-700/50">
                  <div className="text-center">
                    <div className="w-32 h-32 mx-auto mb-4 rounded-full bg-gradient-to-br from-gold-500/20 to-rose-gold-500/20 border border-gold-500/30 flex items-center justify-center">
                      <span className="text-4xl">🐕</span>
                    </div>
                    <p className="text-gold-500 text-sm uppercase tracking-wider">The Loyal Companion</p>
                  </div>
                </div>
                <div className="absolute -inset-4 bg-gradient-to-r from-gold-500/10 via-transparent to-rose-gold-500/10 rounded-card blur-xl" />
              </div>
            </div>
          </section>

          <section className="grid sm:grid-cols-3 gap-6">
            {highlights.map((highlight, index) => (
              <article
                key={highlight.title}
                className="highlight-card hover-lift surface-premium rounded-card p-6 border border-obsidian-700/50"
              >
                <div className="text-gold-500 text-lg mb-4">{highlight.icon}</div>
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-gold-600 mb-3">0{index + 1}</p>
                <h3 className="font-display text-xl font-semibold text-obsidian-50 mb-3">{highlight.title}</h3>
                <p className="text-obsidian-400 text-sm leading-relaxed">{highlight.description}</p>
              </article>
            ))}
          </section>

          <section className="reveal-scroll surface-premium rounded-card p-8 sm:p-10 text-center">
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-gold-500 mb-4">
              Connection, meaning, permanence
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-obsidian-50 mb-6 max-w-2xl mx-auto">
              Emotional warmth with{' '}
              <span className="gold-gradient-text">editorial precision</span>.
            </h2>
            <p className="text-obsidian-400 max-w-xl mx-auto leading-relaxed">
              The Bond Collection is designed to feel intimate and modern at once — soft enough for memory,
              refined enough for everyday wear, and calm in the way it moves.
            </p>
          </section>

          <section className="grid sm:grid-cols-2 gap-6">
            <article className="reveal-scroll hover-lift surface-premium rounded-card p-6 border border-obsidian-700/50">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gold-500/10 border border-gold-500/20 flex items-center justify-center">
                  <span className="text-gold-500">✦</span>
                </div>
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-gold-600">Micro-interaction</p>
              </div>
              <h3 className="font-display text-xl font-semibold text-obsidian-50 mb-3">Tactile, never flashy</h3>
              <p className="text-obsidian-400 text-sm leading-relaxed">
                Buttons respond with subtle lift, cards settle into view, and every transition stays calm, warm,
                and deliberate.
              </p>
            </article>
            <article className="reveal-scroll hover-lift surface-premium rounded-card p-6 border border-obsidian-700/50">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gold-500/10 border border-gold-500/20 flex items-center justify-center">
                  <span className="text-gold-500">✦</span>
                </div>
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-gold-600">Reduced motion</p>
              </div>
              <h3 className="font-display text-xl font-semibold text-obsidian-50 mb-3">Accessible by default</h3>
              <p className="text-obsidian-400 text-sm leading-relaxed">
                Every non-essential animation yields to user preference so the experience stays readable,
                intentional, and comfortable.
              </p>
            </article>
          </section>

          <section className="text-center py-8">
            <p className="text-obsidian-500 text-sm tracking-wider">
              Ready to carry what matters?{' '}
              <Link href="/shop" className="text-gold-500 hover:text-gold-400 transition-colors">
                Explore the collection →
              </Link>
            </p>
          </section>
        </div>
      </Container>
    </div>
  );
}