import { Container } from '@/components/ui/Container';

export const metadata = {
  title: 'About - Loving Charmz',
  description: 'Learn about our story and mission.',
};

export default function AboutPage() {
  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-40 right-20 w-[400px] h-[400px] bg-gold-500/5 rounded-full blur-3xl" />
      </div>

      <Container className="py-12 relative">
        <div className="max-w-3xl mx-auto">
          <span className="badge-gold inline-flex items-center">Our Story</span>
          <h1 className="font-display text-4xl sm:text-5xl font-semibold text-obsidian-50 mt-6 mb-6">
            Crafting meaningful connections
          </h1>
          
          <div className="space-y-6 text-obsidian-300 leading-relaxed">
            <p>
              Loving Charmz was born from a simple truth: the bond between a person and their pet 
              is one of the purest forms of love. It&apos;s a connection that transcends words, 
              transcending time, and lasting forever.
            </p>
            <p>
              We believe that jewelry should be more than an accessory. It should be a vessel 
              for memory, a tangible reminder of the bonds that shape our lives. Every piece we 
              create is designed to carry your story — whether it honors a beloved companion who&apos;s 
              with you now, or one who&apos;s forever in your heart.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6 mt-12">
            <div className="text-center p-6">
              <div className="text-4xl mb-3">💎</div>
              <h3 className="font-display text-lg font-semibold text-obsidian-50 mb-2">Handcrafted</h3>
              <p className="text-obsidian-400 text-sm">Each piece is made with care by skilled artisans.</p>
            </div>
            <div className="text-center p-6">
              <div className="text-4xl mb-3">🌍</div>
              <h3 className="font-display text-lg font-semibold text-obsidian-50 mb-2">Ethically Sourced</h3>
              <p className="text-obsidian-400 text-sm">Materials come from responsible suppliers.</p>
            </div>
            <div className="text-center p-6">
              <div className="text-4xl mb-3">💝</div>
              <h3 className="font-display text-lg font-semibold text-obsidian-50 mb-2">Made with Love</h3>
              <p className="text-obsidian-400 text-sm">Every creation carries our passion for meaning.</p>
            </div>
          </div>

          <div className="mt-16 surface-premium rounded-card p-8 border border-obsidian-700/50">
            <h2 className="font-display text-2xl font-semibold text-obsidian-50 mb-4">
              Get in Touch
            </h2>
            <p className="text-obsidian-400 mb-6">
              Questions? Custom order inquiries? We&apos;d love to hear from you.
            </p>
            <a href="mailto:hello@lovingcharmz.com" className="btn-gold px-8 py-3 rounded-pill text-sm font-semibold uppercase">
              Contact Us
            </a>
          </div>
        </div>
      </Container>
    </div>
  );
}