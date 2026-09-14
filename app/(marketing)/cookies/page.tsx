import { Container } from '@/components/ui/Container';

export const metadata = {
  title: 'Cookies Policy — Loving Charmz',
  description: 'How we use cookies on our website.',
};

export default function CookiesPolicyPage() {
  return (
    <Container className="py-12 sm:py-16">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <span className="badge-mint">Policy</span>
          <h1 className="font-display text-4xl sm:text-5xl font-semibold leading-[1.1] tracking-tight mt-6 text-plum-900">
            Cookies Policy
          </h1>
          <p className="mt-4 text-ink-600">
            Last updated: September 2026
          </p>
        </div>

        <div className="space-y-8 text-ink-700 leading-relaxed">
          <section>
            <h2 className="font-display text-xl font-semibold text-plum-900 mb-3">What are cookies?</h2>
            <p>
              Cookies are small text files placed on your device when you visit a website. They help the site remember your preferences and keep your session secure.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-plum-900 mb-3">How we use cookies</h2>
            <p>We use only essential cookies required to run our store. These include:</p>
            <ul className="list-disc list-inside space-y-2 mt-3">
              <li><strong>Session cookies</strong> — keep you signed in as you browse and add items to your cart.</li>
              <li><strong>Cart cookies</strong> — remember the items in your shopping bag between pages.</li>
              <li><strong>Authentication cookies</strong> — maintain your login state so you do not have to sign in on every page.</li>
              <li><strong>Preference cookies</strong> — remember settings like your chosen currency or language.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-plum-900 mb-3">What we do not use</h2>
            <p>
              We do not use any third-party tracking, advertising, or analytics cookies. There are no Facebook pixels, Google Analytics scripts, or retargeting tags on this site.
            </p>
            <p className="mt-3">
              We do not sell or share your data with advertisers.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-plum-900 mb-3">Third-party services</h2>
            <p>
              Our checkout is processed through PayPal and Square. When you pay, those services may place their own cookies as part of their payment flow. We do not control their cookie usage — please refer to their respective policies.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-plum-900 mb-3">Managing cookies</h2>
            <p>
              Most browsers allow you to block or delete cookies. Blocking essential cookies may prevent the site from functioning correctly — your cart, login, and preferences may not work as expected.
            </p>
            <p className="mt-3">
              To manage cookies in your browser, check the help or settings menu of your browser (Chrome, Firefox, Safari, Edge, etc.).
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-plum-900 mb-3">Changes to this policy</h2>
            <p>
              We may update this policy from time to time. Any changes will be reflected on this page with an updated date.
            </p>
          </section>

          <div className="surface-card p-6 mt-8">
            <p className="text-sm text-ink-600">
              Questions about cookies?{' '}
              <a href="mailto:hello@lovingcharmz.com" className="plum-gradient-text font-medium">
                Contact us
              </a>
              {' '}— we are happy to clarify.
            </p>
          </div>
        </div>
      </div>
    </Container>
  );
}
