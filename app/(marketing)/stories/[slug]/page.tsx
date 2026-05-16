import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { stories } from '../page';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const story = stories.find(s => s.slug === slug);
  if (!story) return { title: 'Story Not Found' };
  return {
    title: `${story.title} - Loving Charmz Stories`,
    description: story.excerpt,
  };
}

export default async function StoryPage({ params }: Props) {
  const { slug } = await params;
  const story = stories.find(s => s.slug === slug);
  
  if (!story) {
    notFound();
  }

  const currentIndex = stories.findIndex(s => s.slug === slug);
  const prevStory = currentIndex > 0 ? stories[currentIndex - 1] : null;
  const nextStory = currentIndex < stories.length - 1 ? stories[currentIndex + 1] : null;

  return (
    <Container className="py-12">
      <nav className="text-sm text-obsidian-500 mb-8">
        <Link href="/stories" className="hover:text-gold-500 transition-colors">Stories</Link>
        <span className="mx-2">/</span>
        <span className="text-obsidian-300">{story.title}</span>
      </nav>

      <article className="max-w-2xl mx-auto">
        <div className="text-6xl mb-6">{story.emoji}</div>
        
        <span className="text-sm text-obsidian-500">{story.date}</span>
        
        <h1 className="font-display text-4xl sm:text-5xl font-semibold text-obsidian-50 mt-2 mb-4">
          {story.title}
        </h1>
        
        <p className="text-xl text-gold-400 mb-8">{story.subtitle}</p>
        
        <div className="prose prose-invert prose-lg text-obsidian-300 leading-relaxed space-y-6">
          {story.content.split('\n\n').map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-obsidian-700">
          <p className="text-obsidian-500 italic">
            — {story.author}
          </p>
        </div>

        <div className="mt-12 flex flex-col sm:flex-row justify-between gap-4">
          {prevStory ? (
            <Link href={`/stories/${prevStory.slug}`} className="flex items-center gap-2 text-obsidian-400 hover:text-gold-500 transition-colors">
              <span>←</span>
              <span>Previous</span>
            </Link>
          ) : <div />}
          {nextStory ? (
            <Link href={`/stories/${nextStory.slug}`} className="flex items-center gap-2 text-obsidian-400 hover:text-gold-500 transition-colors">
              <span>Next</span>
              <span>→</span>
            </Link>
          ) : <div />}
        </div>
      </article>

      <div className="text-center mt-16 surface-premium rounded-card p-8 border border-obsidian-700/50 max-w-2xl mx-auto">
        <h2 className="font-display text-2xl font-semibold text-obsidian-50 mb-3">
          Have a story to share?
        </h2>
        <p className="text-obsidian-400 mb-4">
          We&apos;d love to hear how your keepsake carries your memories.
        </p>
        <a href="mailto:hello@lovingcharmz.com" className="btn-outline-gold px-6 py-2 rounded-pill text-sm font-semibold uppercase">
          Get in Touch
        </a>
      </div>
    </Container>
  );
}