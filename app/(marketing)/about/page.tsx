import { Container } from '@/components/ui/Container';
import { ScrollReveal } from '@/components/ui/ScrollReveal';

export const metadata = {
  title: 'About — Loving Charmz',
  description: 'Learn about Loving Charmz and the meaning behind the Bond Collection.',
};

export default function AboutPage() {
  return (
    <Container className="py-12 sm:py-16">
      <div className="max-w-3xl mx-auto">
        <ScrollReveal>
          <span className="badge-mint">Our story</span>
          <h1 className="section-title font-display text-4xl sm:text-5xl font-semibold text-plum-900 mt-4">
            Crafting meaningful connections
          </h1>
        </ScrollReveal>

        <ScrollReveal delay={120}>
          <div className="mt-8 space-y-6 text-ink-700 leading-relaxed">
            <p>
              Loving Charmz was born from a simple truth: the bond between a person and their pet is one of the purest forms of love. It is a connection that transcends words, transcends time, and lasts forever.
            </p>
            <p>
              We believe that jewelry should be more than an accessory. It should be a vessel for memory — a tangible reminder of the bonds that shape our lives. Every piece we create is designed to carry your story: whether it honors a beloved companion who is with you now, or one who is forever in your heart.
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={180}>
          <div className="mt-12 grid sm:grid-cols-3 gap-6">
            <div className="surface-card inner-highlight p-6 text-center hover-lift">
              <span className="badge-mint mb-3">Handcrafted</span>
              <h3 className="font-display text-lg font-semibold text-plum-900 mt-2">Made with care</h3>
              <p className="text-sm text-ink-600 mt-2">Each piece is finished by hand, one at a time.</p>
            </div>
            <div className="surface-card inner-highlight p-6 text-center hover-lift">
              <span className="badge-mint mb-3">Ethically sourced</span>
              <h3 className="font-display text-lg font-semibold text-plum-900 mt-2">Responsibly made</h3>
              <p className="text-sm text-ink-600 mt-2">Materials come from partners we trust and can name.</p>
            </div>
            <div className="surface-card inner-highlight p-6 text-center hover-lift">
              <span className="badge-mint mb-3">Made with love</span>
              <h3 className="font-display text-lg font-semibold text-plum-900 mt-2">Carries meaning</h3>
              <p className="text-sm text-ink-600 mt-2">Every creation carries our respect for what you love.</p>
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={240}>
          <div className="mt-16 surface-card inner-highlight p-8 text-center">
            <h2 className="font-display text-2xl font-semibold text-plum-900">Get in touch</h2>
            <p className="mt-2 text-ink-600">
              Questions, custom order inquiries, or just want to say hello?
            </p>
            <a href="mailto:hello@lovingcharmz.com" className="btn-plum mt-6 px-8 py-3 text-sm">
              Contact us
            </a>
          </div>
        </ScrollReveal>
      </div>
    </Container>
  );
}
