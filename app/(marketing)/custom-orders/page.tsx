import Link from 'next/link';
import { Container } from '@/components/ui/Container';

export const metadata = {
  title: 'Custom Orders - Loving Charmz',
  description: 'Create a personalized keepsake that tells your unique story.',
};

export default function CustomOrdersPage() {
  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-40 left-20 w-[500px] h-[500px] bg-gold-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-40 right-20 w-[400px] h-[400px] bg-rose-gold-500/5 rounded-full blur-3xl" />
      </div>

      <Container className="py-12 relative">
        <div className="text-center max-w-3xl mx-auto">
          <span className="badge-gold inline-flex items-center">Custom Creations</span>
          <h1 className="font-display text-4xl sm:text-5xl font-semibold text-obsidian-50 mt-6 mb-6">
            Your story, crafted into something lasting
          </h1>
          <p className="text-obsidian-400 text-lg leading-relaxed mb-10">
            Every pet bond is unique. Our custom order process allows you to create a piece that 
            carries your story — whether it&apos;s a name engraving, a specific charm, or a 
            design inspired by your pet.
          </p>

          <div className="grid sm:grid-cols-3 gap-6 mb-12">
            <div className="surface-premium rounded-card p-6 border border-obsidian-700/50">
              <div className="text-3xl mb-3">🏷️</div>
              <h3 className="font-display text-lg font-semibold text-obsidian-50 mb-2">Name Engraving</h3>
              <p className="text-obsidian-400 text-sm">
                Add your pet&apos;s name to keep them close every day
              </p>
            </div>
            <div className="surface-premium rounded-card p-6 border border-obsidian-700/50">
              <div className="text-3xl mb-3">💎</div>
              <h3 className="font-display text-lg font-semibold text-obsidian-50 mb-2">Charm Selection</h3>
              <p className="text-obsidian-400 text-sm">
                Choose charms that represent your bond
              </p>
            </div>
            <div className="surface-premium rounded-card p-6 border border-obsidian-700/50">
              <div className="text-3xl mb-3">📸</div>
              <h3 className="font-display text-lg font-semibold text-obsidian-50 mb-2">Reference Photo</h3>
              <p className="text-obsidian-400 text-sm">
                Share a photo for inspiration
              </p>
            </div>
          </div>

          <div className="surface-premium rounded-card p-8 border border-obsidian-700/50 max-w-xl mx-auto">
            <h2 className="font-display text-2xl font-semibold text-obsidian-50 mb-4">
              Start Your Custom Order
            </h2>
            <p className="text-obsidian-400 mb-6">
              Tell us about your vision. We&apos;ll work with you to bring it to life.
            </p>
            <form className="space-y-4 text-left">
              <input
                type="text"
                placeholder="Your name"
                className="input-gold w-full px-4 py-3 rounded-card"
              />
              <input
                type="email"
                placeholder="Email address"
                className="input-gold w-full px-4 py-3 rounded-card"
              />
              <textarea
                placeholder="Tell us about your vision... What would you like to create?"
                rows={4}
                className="input-gold w-full px-4 py-3 rounded-card resize-none"
              />
              <button
                type="submit"
                className="btn-gold w-full py-3 px-6 rounded-pill text-sm font-semibold uppercase"
              >
                Submit Request
              </button>
            </form>
          </div>

          <div className="mt-12 text-obsidian-500 text-sm">
            <p>Questions? <Link href="/contact" className="text-gold-500 hover:text-gold-400">Contact us</Link></p>
          </div>
        </div>
      </Container>
    </div>
  );
}