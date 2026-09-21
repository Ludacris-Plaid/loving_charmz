import { Container } from '@/components/ui/Container';

export const metadata = {
  title: 'Shipping Policy — Loving Charmz',
  description: 'Shipping rates, delivery times, and international shipping information.',
};

export default function ShippingPolicyPage() {
  return (
    <Container className="py-12 sm:py-16">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <span className="badge-mint">Policy</span>
          <h1 className="font-display text-4xl sm:text-5xl font-semibold leading-[1.1] tracking-tight mt-6 text-plum-900">
            Shipping Policy
          </h1>
          <p className="mt-4 text-ink-600">
            Last updated: September 2026
          </p>
        </div>

        <div className="space-y-8 text-ink-700 leading-relaxed">
          <section>
            <h2 className="font-display text-xl font-semibold text-plum-900 mb-3">Free Shipping</h2>
            <p>
              We offer free <strong>standard</strong> shipping on all Canadian orders over $50 CAD. No promo code is needed — free shipping is applied automatically at checkout when you choose the standard shipping option.
            </p>
            <p className="mt-3">
              Upgraded services (Xpresspost, Priority) are not included in the free-shipping promotion. You may still choose them at checkout, and their listed rate is charged even when your order qualifies for free standard shipping.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-plum-900 mb-3">Canadian Shipping</h2>
            <p>
              Orders within Canada ship via Canada Post. At checkout you can pick from the live services available for your address:
            </p>
            <ul className="mt-3 list-disc pl-6 space-y-1">
              <li><strong>Regular Parcel</strong> (standard) — 5–10 business days. Free over $50 CAD; $9.99 flat rate under $50.</li>
              <li><strong>Xpresspost</strong> — typically 2–3 business days, guaranteed, charged at the listed rate.</li>
              <li><strong>Priority</strong> — next-day to 2 business days, guaranteed, charged at the listed rate.</li>
            </ul>
            <p className="mt-3">
              Rates are calculated live from Canada Post for your postal code and shown before you pay.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-plum-900 mb-3">International Shipping</h2>
            <p>
              We ship worldwide. International shipping rates are calculated at checkout based on your location and order weight. Delivery typically takes 10–20 business days.
            </p>
            <p className="mt-3">
              International customers are responsible for any customs duties, taxes, or import fees imposed by their country. Loving Charmz is not responsible for delays caused by customs processing.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-plum-900 mb-3">Order Processing</h2>
            <p>
              Most orders are processed within 1–2 business days. You will receive a shipping confirmation email with a tracking number once your order has shipped.
            </p>
            <p className="mt-3">
              Please ensure your shipping address is correct at checkout. We are not responsible for orders shipped to an incorrect address provided by the customer.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-plum-900 mb-3">Tracking</h2>
            <p>
              Every order includes tracking. You can track your shipment using the link in your confirmation email or from your account dashboard under &ldquo;Orders.&rdquo;
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-plum-900 mb-3">Lost or Damaged Packages</h2>
            <p>
              If your package appears to be lost or arrives damaged, contact us at{' '}
              <a href="mailto:hello@lovingcharmz.com" className="plum-gradient-text font-medium">
                hello@lovingcharmz.com
              </a>
              {' '}within 14 days of the expected delivery date. We will work with the carrier to resolve the issue and, where appropriate, send a replacement.
            </p>
          </section>

          <div className="surface-card p-6 mt-8">
            <p className="text-sm text-ink-600">
              Questions about your shipment?{' '}
              <a href="mailto:hello@lovingcharmz.com" className="plum-gradient-text font-medium">
                Contact us
              </a>
              {' '}— we are happy to help.
            </p>
          </div>
        </div>
      </div>
    </Container>
  );
}
