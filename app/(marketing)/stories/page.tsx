import { Container } from '@/components/ui/Container';

export const metadata = {
  title: 'Stories - Loving Charmz',
  description: 'Heartwarming stories from our community.',
};

export default function StoriesPage() {
  return (
    <Container className="py-12">
      <div className="text-center mb-12">
        <span className="badge-gold inline-flex items-center">Community Stories</span>
        <h1 className="font-display text-4xl sm:text-5xl font-semibold text-obsidian-50 mt-6 mb-4">
          Stories that touch the heart
        </h1>
        <p className="text-obsidian-400 max-w-xl mx-auto">
          Every piece of jewelry carries a story. Here we share the memories, 
          bonds, and love that inspire our community.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          {
            emoji: '💝',
            title: 'A Mother\'s Tribute',
            excerpt: 'How a simple pendant helped Sarah keep her beloved Luna close every day.',
          },
          {
            emoji: '🌈',
            title: 'Rainbow Bridge',
            excerpt: 'Mark found comfort in a custom piece honoring his faithful companion of 15 years.',
          },
          {
            emoji: '✨',
            title: 'New Beginnings',
            excerpt: 'A young girl\'s first pet inspired a gift that now symbolizes unconditional love.',
          },
        ].map((story, i) => (
          <article
            key={i}
            className="surface-premium rounded-card p-6 border border-obsidian-700/50 hover-lift"
          >
            <div className="text-4xl mb-4">{story.emoji}</div>
            <h2 className="font-display text-xl font-semibold text-obsidian-50 mb-2">
              {story.title}
            </h2>
            <p className="text-obsidian-400 text-sm">{story.excerpt}</p>
          </article>
        ))}
      </div>

      <div className="text-center mt-12 surface-premium rounded-card p-8 border border-obsidian-700/50 max-w-2xl mx-auto">
        <h2 className="font-display text-2xl font-semibold text-obsidian-50 mb-3">
          Share Your Story
        </h2>
        <p className="text-obsidian-400 mb-4">
          Have a story to share? We&apos;d love to hear how your keepsake carries your memories.
        </p>
        <a href="mailto:hello@lovingcharmz.com" className="btn-outline-gold px-6 py-2 rounded-pill text-sm font-semibold uppercase">
          Get in Touch
        </a>
      </div>
    </Container>
  );
}