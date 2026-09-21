import { Container } from '@/components/ui/Container';

export const metadata = {
  title: 'Terms of Service — Loving Charmz',
  description: 'The terms that govern your use of the Loving Charmz store and purchases.',
};

export default function TermsPage() {
  return (
    <Container className="py-12 sm:py-16">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <span className="badge-mint">Policy</span>
          <h1 className="font-display text-4xl sm:text-5xl font-semibold leading-[1.1] tracking-tight mt-6 text-plum-900">
            Terms of Service
          </h1>
          <p className="mt-4 text-ink-600">
            Last updated: September 2026
          </p>
        </div>

        <div className="space-y-8 text-ink-700 leading-relaxed">
          <section>
            <h2 className="font-display text-xl font-semibold text-plum-900 mb-3">The Store</h2>
            <p>
              Loving Charmz (&ldquo;we&rdquo;, &ldquo;us&rdquo;) operates lovingcharmz.com, an online
              store selling symbolic and memorial jewelry. By browsing the site, creating an account,
              or placing an order, you agree to these terms.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-plum-900 mb-3">Orders &amp; Pricing</h2>
            <p>
              All prices are in Canadian dollars (CAD) and are subject to applicable sales taxes,
              which are calculated at checkout. We reserve the right to correct pricing errors, cancel
              and refund orders placed with incorrect pricing, or refuse orders that appear fraudulent.
              An order is accepted — and the contract formed — when your payment is captured and you
              receive the order confirmation email.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-plum-900 mb-3">Payments</h2>
            <p>
              Card payments are processed by Square. We never see or store your full card number.
              By submitting a payment you confirm you are authorized to use the payment method.
              Discount codes are single-customer codes as described on the offer, may have expiry
              dates and usage limits, and cannot be exchanged for cash.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-plum-900 mb-3">Shipping</h2>
            <p>
              We ship to addresses in Canada and the United States. Shipping timelines and costs are
              shown at checkout and described in our{' '}
              <a href="/shipping" className="plum-gradient-text font-medium">Shipping Policy</a>.
              Risk of loss passes to you on delivery to the carrier.
            </p>
            <p className="mt-3">
              Free shipping promotions apply to standard shipping only. Where an order qualifies for
              free shipping and an upgraded service (such as Xpresspost or Priority) is selected, the
              listed rate for that upgraded service is charged.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-plum-900 mb-3">Returns &amp; Refunds</h2>
            <p>
              Returns are accepted within 30 days of delivery on non-custom items in original
              condition — full details in our{' '}
              <a href="/refunds" className="plum-gradient-text font-medium">Refund Policy</a>.
              Custom or personalized pieces are made just for you and are final sale unless they
              arrive damaged or defective.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-plum-900 mb-3">Accounts</h2>
            <p>
              You are responsible for keeping your account password confidential and for activity
              under your account. You must provide accurate information, and you must be at least
              the age of majority in your province or territory to purchase.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-plum-900 mb-3">Custom Orders</h2>
            <p>
              Custom pieces are quoted individually before work begins. Unless otherwise agreed in
              writing, custom orders require payment in full up front and are non-refundable once
              production has started, as set out in the{' '}
              <a href="/refunds" className="plum-gradient-text font-medium">Refund Policy</a>.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-plum-900 mb-3">Intellectual Property &amp; Acceptable Use</h2>
            <p>
              All site content — product photography, text, branding, and design — belongs to Loving
              Charmz and may not be copied or reused commercially without permission. You agree not
              to misuse the site: no scraping, no attempting to breach or probe the site&rsquo;s
              security, no placing fraudulent orders, and no abuse of discount codes or other offers.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-plum-900 mb-3">Liability</h2>
            <p>
              To the maximum extent permitted by law, our liability for any claim relating to an
              order or the site is limited to the amount you paid for the order in question. We are
              not liable for indirect or consequential losses. These terms do not affect your
              statutory rights under Canadian consumer protection law.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-plum-900 mb-3">Changes &amp; Contact</h2>
            <p>
              We may update these terms from time to time; the current version is always on this
              page. Material changes to orders already placed are communicated by email. These terms
              are governed by the laws of Canada and the province of Ontario.
            </p>
            <p className="mt-3">
              Questions about these terms? Email{' '}
              <a href="mailto:hello@lovingcharmz.com" className="plum-gradient-text font-medium">
                hello@lovingcharmz.com
              </a>.
            </p>
          </section>

          <div className="surface-card p-6 mt-8">
            <p className="text-sm text-ink-600">
              By placing an order you confirm you have read and agree to these terms, the{' '}
              <a href="/refunds" className="plum-gradient-text font-medium">Refund Policy</a>, and
              the <a href="/privacy" className="plum-gradient-text font-medium">Privacy Policy</a>.
            </p>
          </div>
        </div>
      </div>
    </Container>
  );
}
