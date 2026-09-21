import { Container } from '@/components/ui/Container';

export const metadata = {
  title: 'FAQ — Loving Charmz',
  description: 'Frequently asked questions about orders, shipping, returns, wholesale, and more.',
};

const faqCategories = [
  {
    title: 'Shipping & delivery',
    items: [
      {
        q: 'How long does shipping take?',
        a: 'Orders within Canada are typically delivered within 5–10 business days. International orders may take 10–20 business days depending on your location and customs processing.',
      },
      {
        q: 'How much is shipping?',
        a: 'Free standard shipping (Canada Post Regular Parcel) applies to all Canadian orders over $50 CAD. Orders under $50 ship at a flat rate of $9.99 CAD. Faster upgrades like Xpresspost and Priority are available at checkout at their listed rates — choosing them charges that rate even when your order qualifies for free standard shipping. International shipping rates are calculated at checkout.',
      },
      {
        q: 'Does free shipping apply to Xpresspost or Priority?',
        a: 'No. The free-shipping-over-$50 promotion covers standard shipping (Regular Parcel) only. You are welcome to upgrade to Xpresspost or Priority at checkout — the displayed rate for that service is what you pay.',
      },
      {
        q: 'Do you ship internationally?',
        a: 'Yes, we ship worldwide. International customers are responsible for any customs duties or import taxes that may apply in their country.',
      },
      {
        q: 'Can I track my order?',
        a: 'Yes. Once your order ships, you will receive a confirmation email with a tracking number. You can also track your order from your account dashboard under "Orders."',
      },
    ],
  },
  {
    title: 'Returns & refunds',
    items: [
      {
        q: 'What is your return policy?',
        a: 'We accept returns within 30 days of delivery for items in their original, unworn condition. Custom or personalized pieces are final sale. See our full Refund Policy for details.',
      },
      {
        q: 'How do I start a return?',
        a: 'Contact us at hello@lovingcharmz.com with your order number and reason for return. We will provide instructions and a return label if applicable.',
      },
      {
        q: 'When will I receive my refund?',
        a: 'Refunds are processed within 5–7 business days of receiving the returned item. The refund is issued to your original payment method.',
      },
      {
        q: 'Can I exchange an item?',
        a: 'We do not offer direct exchanges at this time. Please initiate a return for a refund and place a new order for the item you prefer.',
      },
    ],
  },
  {
    title: 'Products & materials',
    items: [
      {
        q: 'What metals and sizes are available?',
        a: 'Most pieces are available in Brass and Stainless Steel, with sizes Small, Medium, and Large. Each product page shows the available options and any price differences.',
      },
      {
        q: 'How do I care for my jewelry?',
        a: 'Store pieces in a dry place away from direct sunlight, and avoid contact with perfume, lotions, and water. Brass may develop a natural patina over time — gently polish it with a soft cloth to restore shine.',
      },
    ],
  },
  {
    title: 'Payment & security',
    items: [
      {
        q: 'Is my payment information secure?',
        a: 'Yes. All transactions are processed through PayPal or Square, both of which use industry-standard encryption. We never store your full credit card number on our servers.',
      },
      {
        q: 'Do you use cookies on your website?',
        a: 'Yes. We use essential cookies to power your shopping experience (cart, login, preferences). We do not use tracking or advertising cookies. See our Cookies Policy for full details.',
      },
    ],
  },
  {
    title: 'Custom orders & wholesale',
    items: [
      {
        q: 'Can I customize or personalize a piece?',
        a: 'Many of our pieces can be engraved or customized. Visit our Custom Orders page to start a conversation about what you have in mind.',
      },
      {
        q: 'Do you offer wholesale or bulk pricing?',
        a: 'Yes. We work with boutiques, gift shops, and retailers across Canada. Visit our Wholesale page for more information on minimum orders, pricing, and how to apply.',
      },
    ],
  },
];

/** FAQPage structured data — lets Google surface these answers directly in search results. */
const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqCategories.flatMap((cat) =>
    cat.items.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  ),
};

export default function FAQPage() {
  return (
    <Container className="py-12 sm:py-16">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <span className="badge-mint">Help centre</span>
          <h1 className="font-display text-4xl sm:text-5xl font-semibold leading-[1.1] tracking-tight mt-6 text-plum-900">
            Frequently asked questions
          </h1>
          <p className="mt-4 text-ink-600 max-w-xl mx-auto">
            Everything you need to know about ordering, shipping, returns, and more.
          </p>
        </div>

        {/* Questions grouped by topic, each collapsed until opened (native
            <details> — works without JavaScript and with keyboards). */}
        <div className="space-y-10">
          {faqCategories.map((cat) => (
            <section key={cat.title} aria-labelledby={`faq-${cat.title.replace(/\W+/g, '-')}`}>
              <h2
                id={`faq-${cat.title.replace(/\W+/g, '-')}`}
                className="font-display text-xl font-semibold text-plum-900 mb-4"
              >
                {cat.title}
              </h2>
              <div className="space-y-3">
                {cat.items.map((faq) => (
                  <details key={faq.q} className="surface-card group px-6 py-4">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 [&::-webkit-details-marker]:hidden">
                      <span className="font-display text-base font-semibold text-plum-900">
                        {faq.q}
                      </span>
                      <svg
                        className="h-4 w-4 shrink-0 text-plum-700 transition-transform duration-200 group-open:rotate-180"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </summary>
                    <p className="mt-3 text-ink-700 leading-relaxed text-sm">{faq.a}</p>
                  </details>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-16 surface-card inner-highlight p-8 text-center">
          <h2 className="font-display text-2xl font-semibold text-plum-900">Still have questions?</h2>
          <p className="mt-2 text-ink-600">
            Reach out and we will get back to you within one business day.
          </p>
          <a href="mailto:hello@lovingcharmz.com" className="btn-plum mt-6 px-8 py-3 text-sm">
            Contact us
          </a>
        </div>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
    </Container>
  );
}
