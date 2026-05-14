import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

const highlights = [
  {
    title: 'Connection',
    description: 'Because they are not just pets. Every piece is made to hold the bond close.',
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

export default function HomePage() {
  return (
    <Container className="py-8 sm:py-10">
      <Card padding="lg" className="flex min-h-[calc(100vh-8rem)] flex-col justify-between gap-10">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.35em] text-brand-600">Loving Charmz</p>
            <p className="mt-2 max-w-md text-sm text-brand-600">
              Pet bond jewelry for women who carry love, memory, and connection.
            </p>
          </div>
          <Link
            href="/account"
            className="rounded-full border border-brand-400/20 px-4 py-2 text-sm font-medium text-brand-700 transition hover:border-brand-500 hover:text-brand-500"
          >
            Customer account
          </Link>
        </div>

        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <Badge>Bond Collection now featured</Badge>
            <h1 className="mt-6 max-w-3xl text-4xl font-semibold leading-tight text-brand-800 sm:text-5xl lg:text-6xl">
              Symbolic jewelry for women who want to carry meaning, memories, and connection.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-brand-600 sm:text-lg">
              Loving Charmz creates modern keepsakes inspired by the bond between women and the pets they love.
              Shop heartfelt pieces, start a personalized order, and create a profile that honors your story.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/shop"
                className="inline-flex items-center justify-center rounded-full bg-brand-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-500"
              >
                Shop the Bond Collection
              </Link>
              <Link
                href="/custom-orders"
                className="inline-flex items-center justify-center rounded-full border border-brand-500 px-6 py-3 text-sm font-semibold text-brand-700 transition hover:bg-white"
              >
                Create a custom keepsake
              </Link>
            </div>
          </div>

          <Card padding="md" className="grid gap-4">
            <div className="rounded-card bg-[linear-gradient(135deg,#f7dfd6_0%,#fdf8f5_100%)] p-5">
              <p className="text-sm font-medium uppercase tracking-[0.3em] text-brand-600">Featured keepsake</p>
              <h2 className="mt-3 font-display text-2xl font-semibold text-brand-800">The Loyal Companion</h2>
              <p className="mt-3 text-sm leading-7 text-brand-600">
                Always by your side. Always in your heart. Designed for women who want something personal,
                subtle, and emotionally lasting.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {highlights.map((highlight) => (
                <article
                  key={highlight.title}
                  className="rounded-card border border-brand-400/12 bg-white/80 p-4"
                >
                  <h3 className="text-lg font-semibold text-brand-800">{highlight.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-brand-600">{highlight.description}</p>
                </article>
              ))}
            </div>
          </Card>
        </div>
      </Card>
    </Container>
  );
}