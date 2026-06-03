import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Container } from '@/components/ui/Container';
import { stories } from '../page';

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const story = stories.find((s) => s.slug === slug);
  if (!story) return { title: 'Story Not Found' };
  return {
    title: `${story.title} — Loving Charmz Stories`,
    description: story.excerpt,
  };
}

export default async function StoryPage({ params }: Props) {
  const { slug } = await params;
  const story = stories.find((s) => s.slug === slug);
  if (!story) notFound();

  const currentIndex = stories.findIndex((s) => s.slug === slug);
  const prevStory = currentIndex > 0 ? stories[currentIndex - 1] : null;
  const nextStory = currentIndex < stories.length - 1 ? stories[currentIndex + 1] : null;

  return (
    <Container className="py-12 sm:py-16">
      <nav className="mb-8 text-sm text-ink-500">
        <Link href="/stories" className="hover:text-plum-700 motion-base">Stories</Link>
        <span className="mx-2 text-ink-400">/</span>
        <span className="text-ink-700">{story.title}</span>
      </nav>

      <article className="max-w-2xl mx-auto">
        <div className="relative aspect-video overflow-hidden rounded-card border border-cream-300 mb-8">
          <Image src={story.image} alt={story.title} fill className="object-cover" />
        </div>

        <span className="text-sm text-ink-500">{story.date}</span>
        <h1 className="font-display text-4xl sm:text-5xl font-semibold text-plum-900 mt-2 mb-3">
          {story.title}
        </h1>
        <p className="text-xl text-plum-700 mb-8">{story.subtitle}</p>

        <div className="space-y-5 text-lg text-ink-700 leading-relaxed">
          {story.content.split('\n\n').map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>

        <div className="mt-10 pt-6 border-t border-cream-300">
          <p className="text-sm text-ink-500 italic">{story.attribution}</p>
        </div>

        <div className="mt-10 flex flex-col sm:flex-row justify-between gap-4 text-sm">
          {prevStory ? (
            <Link href={`/stories/${prevStory.slug}`} className="nav-link inline-flex items-center gap-2">
              <span aria-hidden>←</span> Previous
            </Link>
          ) : <span />}
          {nextStory ? (
            <Link href={`/stories/${nextStory.slug}`} className="nav-link inline-flex items-center gap-2">
              Next <span aria-hidden>→</span>
            </Link>
          ) : <span />}
        </div>
      </article>

      <div className="mt-16 surface-card p-8 text-center max-w-2xl mx-auto">
        <h2 className="font-display text-2xl font-semibold text-plum-900">Have a story to share?</h2>
        <p className="mt-2 text-ink-600">We would love to hear how your keepsake carries your memories.</p>
        <a href="mailto:hello@lovingcharmz.com" className="btn-outline mt-6 px-6 py-2.5 text-sm">
          Get in touch
        </a>
      </div>
    </Container>
  );
}
