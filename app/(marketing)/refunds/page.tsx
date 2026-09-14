import { Container } from '@/components/ui/Container';

export const metadata = {
  title: 'Refund Policy — Loving Charmz',
  description: 'Return, exchange, and refund information for your orders.',
};

export default function RefundPolicyPage() {
  return (
    <Container className="py-12 sm:py-16">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <span className="badge-mint">Policy</span>
          <h1 className="font-display text-4xl sm:text-5xl font-semibold leading-[1.1] tracking-tight mt-6 text-plum-900">
            Refund Policy
          </h1>
          <p className="mt-4 text-ink-600">
            Last updated: September 2026
          </p>
        </div>

        <div className="space-y-8 text-ink-700 leading-relaxed">
          <section>
            <h2 className="font-display text-xl font-semibold text-plum-900 mb-3">Returns</h2>
            <p>
              We accept returns within 30 days of delivery. To be eligible, items must be unused, unworn, and in their original packaging.
            </p>
            <p className="mt-3">
              To initiate a return, email us at{' '}
              <a href="mailto:hello@lovingcharmz.com" className="plum-gradient-text font-medium">
                hello@lovingcharmz.com
              </a>
              {' '}with your order number and reason for the return. We will provide return instructions.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-plum-900 mb-3">Non-Returnable Items</h2>
            <ul className="list-disc list-inside space-y-2 mt-2">
              <li>Custom or personalized pieces (engraved, custom-sized, or made to order)</li>
              <li>Items that have been worn, damaged, or altered by the customer</li>
              <li>Items without original packaging</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-plum-900 mb-3">Refunds</h2>
            <p>
              Once we receive and inspect your return, we will notify you by email. If approved, your refund will be processed to your original payment method within 5–7 business days.
            </p>
            <p className="mt-3">
              Original shipping charges are non-refundable unless the return is due to our error.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-plum-900 mb-3">Exchanges</h2>
            <p>
              We do not offer direct exchanges at this time. If you would like a different item or size, please initiate a return for a refund and place a new order.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-plum-900 mb-3">Damaged or Defective Items</h2>
            <p>
              If your item arrives damaged or defective, contact us within 14 days of delivery with your order number and a photo of the issue. We will send a replacement at no extra cost.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-plum-900 mb-3">Late or Missing Refunds</h2>
            <p>
              If you have not received your refund after 7 business days, please first check with your bank or credit card company. If you still have not received it, contact us and we will look into it.
            </p>
          </section>

          <div className="surface-card p-6 mt-8">
            <p className="text-sm text-ink-600">
              Need help with a return?{' '}
              <a href="mailto:hello@lovingcharmz.com" className="plum-gradient-text font-medium">
                Contact us
              </a>
              {' '}— we will make it right.
            </p>
          </div>
        </div>
      </div>
    </Container>
  );
}
