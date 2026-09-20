import { Container } from '@/components/ui/Container';

export const metadata = {
  title: 'Privacy Policy — Loving Charmz',
  description: 'How Loving Charmz collects, uses, and protects your personal information.',
};

export default function PrivacyPolicyPage() {
  return (
    <Container className="py-12 sm:py-16">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <span className="badge-mint">Policy</span>
          <h1 className="font-display text-4xl sm:text-5xl font-semibold leading-[1.1] tracking-tight mt-6 text-plum-900">
            Privacy Policy
          </h1>
          <p className="mt-4 text-ink-600">
            Last updated: September 2026
          </p>
        </div>

        <div className="space-y-8 text-ink-700 leading-relaxed">
          <section>
            <h2 className="font-display text-xl font-semibold text-plum-900 mb-3">What We Collect</h2>
            <p>
              When you shop with us or create an account, we collect the information needed to fulfil
              your order and communicate with you:
            </p>
            <ul className="list-disc list-inside space-y-2 mt-2">
              <li>Contact details — name, email address, and phone number if you provide it</li>
              <li>Shipping and billing addresses</li>
              <li>Order history and the contents of your cart</li>
              <li>Messages you send us, including custom-order inquiries</li>
              <li>Email address if you join our mailing list</li>
            </ul>
            <p className="mt-3">
              Payment card details are <strong>never</strong> stored on our servers. Card information
              is entered directly into Square&rsquo;s secure payment form, tokenized, and processed by
              Square; we receive only a payment confirmation and the last four digits of the card for
              your receipt.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-plum-900 mb-3">How We Use It</h2>
            <ul className="list-disc list-inside space-y-2 mt-2">
              <li>To process, ship, and support your orders</li>
              <li>To send order confirmations, shipping notices, and receipts</li>
              <li>To respond to your questions and custom-order requests</li>
              <li>To send marketing email — only if you subscribed, and every message includes a one-click unsubscribe</li>
              <li>To detect fraud and keep the store secure</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-plum-900 mb-3">Who We Share It With</h2>
            <p>
              We share personal information only with the service providers needed to run the store,
              and only to the extent necessary:
            </p>
            <ul className="list-disc list-inside space-y-2 mt-2">
              <li><strong>Square</strong> — payment processing</li>
              <li><strong>Supabase</strong> — application database and account storage</li>
              <li><strong>Resend</strong> — transactional email delivery</li>
              <li><strong>Vercel</strong> — website hosting</li>
              <li>Canada Post or other carriers, for shipping labels</li>
            </ul>
            <p className="mt-3">
              We do not sell your personal information, ever.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-plum-900 mb-3">Your Rights</h2>
            <p>
              We are based in Canada and handle personal information in accordance with applicable
              Canadian privacy law (PIPEDA). You may at any time:
            </p>
            <ul className="list-disc list-inside space-y-2 mt-2">
              <li>Request a copy of the personal information we hold about you</li>
              <li>Ask us to correct anything inaccurate</li>
              <li>Ask us to delete your account and personal information, subject to record-keeping we are required to keep for orders</li>
              <li>Unsubscribe from marketing email using the link in any message</li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, email{' '}
              <a href="mailto:hello@lovingcharmz.com" className="plum-gradient-text font-medium">
                hello@lovingcharmz.com
              </a>{' '}
              and we will respond within 30 days.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-plum-900 mb-3">Cookies &amp; Analytics</h2>
            <p>
              We use a small number of strictly necessary cookies to keep you signed in and to keep
              your cart working. See our{' '}
              <a href="/cookies" className="plum-gradient-text font-medium">Cookie Policy</a> for details.
              We do not run advertising trackers.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-plum-900 mb-3">Data Retention &amp; Security</h2>
            <p>
              Order records are kept as long as required for tax and accounting purposes; account data
              is kept until you ask us to delete it. All traffic to and from the site is encrypted with
              TLS, and access to customer data is limited to the store owner.
            </p>
          </section>

          <div className="surface-card p-6 mt-8">
            <p className="text-sm text-ink-600">
              Questions about this policy or your data?{' '}
              <a href="mailto:hello@lovingcharmz.com" className="plum-gradient-text font-medium">
                Contact us
              </a>
              {' '}— a real person reads every message.
            </p>
          </div>
        </div>
      </div>
    </Container>
  );
}
