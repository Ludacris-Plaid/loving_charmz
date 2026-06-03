import Link from 'next/link';
import { Container } from '@/components/ui/Container';

type Props = {
  searchParams: Promise<{ id?: string }>;
};

export const metadata = {
  title: 'Order confirmed — Loving Charmz',
};

export default async function ConfirmationPage({ searchParams }: Props) {
  const { id } = await searchParams;
  const display = id ? id.slice(0, 8).toUpperCase() : 'NEW';

  return (
    <Container className="py-16">
      <div className="max-w-lg mx-auto text-center">
        <div className="mx-auto mb-6 h-20 w-20 rounded-full bg-mint-200 flex items-center justify-center">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M5 12L10 17L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-plum-700" />
          </svg>
        </div>
        <span className="badge-mint">Thank you</span>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold text-plum-900 mt-3 mb-3">
          Your order is placed
        </h1>
        <p className="text-ink-600">
          We have received your keepsake order. A confirmation email is on its way.
        </p>
        {id && (
          <p className="mt-2 text-xs uppercase tracking-[0.18em] text-ink-500">
            Order #{display}
          </p>
        )}

        <div className="surface-card p-6 mt-8 text-left">
          <h2 className="font-display text-lg font-semibold text-plum-900 mb-4">What happens next</h2>
          <ol className="space-y-3 text-sm text-ink-700">
            <li className="flex items-start gap-3">
              <span className="badge-mint shrink-0">1</span>
              <span>You will receive a confirmation email with the details of your order.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="badge-mint shrink-0">2</span>
              <span>Your piece will be handcrafted with care, just for you.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="badge-mint shrink-0">3</span>
              <span>We will email tracking information once your order ships.</span>
            </li>
          </ol>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/account/orders" className="btn-plum px-6 py-2.5 text-sm">
            View my orders
          </Link>
          <Link href="/shop" className="btn-outline px-6 py-2.5 text-sm">
            Continue browsing
          </Link>
        </div>
      </div>
    </Container>
  );
}
