import Link from 'next/link';
import { Container } from '@/components/ui/Container';

export default function CheckoutConfirmationPage() {
  const orderNumber = 'LC-ORDER';

  return (
    <Container className="py-12">
      <div className="max-w-lg mx-auto text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gold-500/20 flex items-center justify-center">
          <span className="text-4xl text-gold-500">✓</span>
        </div>
        
        <h1 className="font-display text-3xl font-semibold text-obsidian-50 mb-4">
          Thank You
        </h1>
        <p className="text-obsidian-400 mb-2">
          Your order has been placed successfully.
        </p>
        <p className="text-obsidian-500 text-sm mb-8">
          Order #{orderNumber}
        </p>

        <div className="surface-premium rounded-card p-6 border border-obsidian-700/50 mb-8 text-left">
          <h2 className="font-display text-lg font-semibold text-obsidian-50 mb-4">What happens next?</h2>
          <ul className="space-y-3 text-sm text-obsidian-400">
            <li className="flex items-start gap-2">
              <span className="text-gold-500">1.</span>
              You&apos;ll receive a confirmation email shortly
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gold-500">2.</span>
              Your order will be handcrafted with care
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gold-500">3.</span>
              We&apos;ll notify you when it ships
            </li>
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/account/orders"
            className="btn-gold px-8 py-3 rounded-pill text-sm font-semibold uppercase"
          >
            View Orders
          </Link>
          <Link
            href="/shop"
            className="btn-outline-gold px-8 py-3 rounded-pill text-sm font-semibold uppercase"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    </Container>
  );
}