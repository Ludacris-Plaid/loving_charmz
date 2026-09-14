import { Container } from '@/components/ui/Container';

export const metadata = {
  title: 'Wholesale — Loving Charmz',
  description: 'Wholesale and bulk pricing for boutiques, gift shops, and retailers.',
};

export default function WholesalePage() {
  return (
    <Container className="py-12 sm:py-16">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <span className="badge-mint">Partnerships</span>
          <h1 className="font-display text-4xl sm:text-5xl font-semibold leading-[1.1] tracking-tight mt-6 text-plum-900">
            Wholesale
          </h1>
          <p className="mt-4 text-ink-600 max-w-xl mx-auto">
            Bring Loving Charmz to your customers. We partner with boutiques, gift shops, and retailers across Canada.
          </p>
        </div>

        <div className="space-y-8 text-ink-700 leading-relaxed">
          <section>
            <h2 className="font-display text-xl font-semibold text-plum-900 mb-3">What we offer</h2>
            <ul className="list-disc list-inside space-y-2 mt-2">
              <li>Competitive wholesale pricing on our full collection</li>
              <li>Minimum order quantities starting at 20 pieces</li>
              <li>Curated starter packs for new stockists</li>
              <li>Branded display materials and product photography</li>
              <li>Priority access to new collections and seasonal lines</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-plum-900 mb-3">How it works</h2>
            <ol className="list-decimal list-inside space-y-3 mt-2">
              <li>
                <strong>Apply.</strong> Send us an email with your business name, location, website or social media, and a brief description of your shop.
              </li>
              <li>
                <strong>Get approved.</strong> We review applications within 5 business days. Approved partners receive our wholesale catalogue and pricing.
              </li>
              <li>
                <strong>Order.</strong> Place your first order and choose your pieces. We ship across Canada with free freight on qualifying orders.
              </li>
            </ol>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-plum-900 mb-3">Who we work with</h2>
            <p>
              We love working with independent boutiques, pet-related businesses, gift shops, florists, and lifestyle stores. If your customers value meaningful, handcrafted jewelry — we are a good fit.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-plum-900 mb-3">Apply now</h2>
            <p>
              Ready to stock Loving Charmz? Email us at{' '}
              <a href="mailto:wholesale@lovingcharmz.com" className="plum-gradient-text font-medium">
                wholesale@lovingcharmz.com
              </a>
              {' '}with the details above and we will be in touch.
            </p>
          </section>

          <div className="surface-card p-6 mt-8 text-center">
            <h2 className="font-display text-2xl font-semibold text-plum-900">Let&apos;s work together</h2>
            <p className="mt-2 text-ink-600">
              We are always looking for new partners who share our love for meaningful jewellery.
            </p>
            <a href="mailto:wholesale@lovingcharmz.com" className="btn-plum mt-6 px-8 py-3 text-sm">
              Get in touch
            </a>
          </div>
        </div>
      </div>
    </Container>
  );
}
