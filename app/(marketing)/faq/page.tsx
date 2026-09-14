import { Container } from '@/components/ui/Container';

export const metadata = {
  title: 'FAQ — Loving Charmz',
  description: 'Frequently asked questions about orders, shipping, returns, wholesale, and more.',
};

const faqs = [
  {
    q: 'How long does shipping take?',
    a: 'Orders within Canada are typically delivered within 5–10 business days. International orders may take 10–20 business days depending on your location and customs processing.',
  },
  {
    q: 'How much is shipping?',
    a: 'We offer free shipping on all Canadian orders over $50 CAD. Orders under $50 ship flat rate at $9.99 CAD. International shipping rates are calculated at checkout.',
  },
  {
    q: 'Do you ship internationally?',
    a: 'Yes, we ship worldwide. International customers are responsible for any customs duties or import taxes that may apply in their country.',
  },
  {
    q: 'Can I track my order?',
    a: 'Yes. Once your order ships, you will receive a confirmation email with a tracking number. You can also track your order from your account dashboard under "Orders."',
  },
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
  {
    q: 'What metals and sizes are available?',
    a: 'Most pieces are available in Brass and Stainless Steel, with sizes Small, Medium, and Large. Each product page shows the available options and any price differences.',
  },
  {
    q: 'Do you offer wholesale or bulk pricing?',
    a: 'Yes. We work with boutiques, gift shops, and retailers across Canada. Visit our Wholesale page for more information on minimum orders, pricing, and how to apply.',
  },
  {
    q: 'How do I care for my jewelry?',
    a: 'Store pieces in a dry place away from direct sunlight. Avoid contact with perfume, lotions, and water. Brass may develop a natural patina over time — this can be gently polished with a soft cloth.',
  },
  {
    q: 'Do you use cookies on your website?',
    a: 'Yes. We use essential cookies to power your shopping experience (cart, login, preferences). We do not use tracking or advertising cookies. See our Cookies Policy for full details.',
  },
  {
    q: 'Is my payment information secure?',
    a: 'Yes. All transactions are processed through PayPal or Square, both of which use industry-standard encryption. We never store your full credit card number on our servers.',
  },
  {
    q: 'Can I customize or personalize a piece?',
    a: 'Many of our pieces can be engraved or customized. Visit our Custom Orders page to start a conversation about what you have in mind.',
  },
];

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

        <div className="space-y-6">
          {faqs.map((faq, i) => (
            <div key={i} className="surface-card p-6">
              <h2 className="font-display text-lg font-semibold text-plum-900">{faq.q}</h2>
              <p className="mt-2 text-ink-700 leading-relaxed text-sm">{faq.a}</p>
            </div>
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
    </Container>
  );
}
