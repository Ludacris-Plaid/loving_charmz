'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { createCheckoutAction } from '@/lib/checkout/actions';

type Props = {
  defaultEmail: string;
};

export function CheckoutForm({ defaultEmail }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      const res = await createCheckoutAction(formData);
      if (res.error) {
        setError(res.error);
      } else if (res.orderId) {
        router.push(`/checkout/confirmation?id=${res.orderId}`);
      }
    });
  };

  return (
    <form action={handleSubmit} className="space-y-8">
      <section className="surface-card p-6">
        <h2 className="font-display text-lg font-semibold text-plum-900 mb-4">Contact</h2>
        <Input
          label="Email"
          name="email"
          type="email"
          required
          autoComplete="email"
          defaultValue={defaultEmail}
        />
      </section>

      <section className="surface-card p-6">
        <h2 className="font-display text-lg font-semibold text-plum-900 mb-4">Shipping address</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="First name" name="firstName" required autoComplete="given-name" />
          <Input label="Last name" name="lastName" required autoComplete="family-name" />
          <div className="sm:col-span-2">
            <Input label="Street address" name="address" required autoComplete="street-address" />
          </div>
          <Input label="City" name="city" required autoComplete="address-level2" />
          <Input label="State / Region" name="state" required autoComplete="address-level1" />
          <Input label="ZIP / Postal" name="zip" required autoComplete="postal-code" />
          <Input label="Country" name="country" defaultValue="US" required autoComplete="country-name" />
        </div>
      </section>

      <section className="surface-card p-6">
        <h2 className="font-display text-lg font-semibold text-plum-900 mb-4">Payment method</h2>
        <div className="space-y-3">
          {[
            { value: 'paypal', label: 'PayPal' },
            { value: 'card', label: 'Credit / Debit Card' },
          ].map((opt, i) => (
            <label
              key={opt.value}
              className="flex items-center gap-3 p-4 rounded-md border border-cream-300 cursor-pointer hover:border-plum-500 motion-base"
            >
              <input
                type="radio"
                name="paymentMethod"
                value={opt.value}
                defaultChecked={i === 0}
                className="accent-plum-700"
              />
              <span className="text-ink-800">{opt.label}</span>
            </label>
          ))}
        </div>
        <p className="text-xs text-ink-500 mt-3">
          You will be redirected to your payment provider to complete the transaction. No card details are stored on this site.
        </p>
      </section>

      {error && (
        <p className="text-sm text-red-600" role="alert">{error}</p>
      )}

      <button type="submit" disabled={pending} className="btn-plum w-full py-3 text-sm">
        {pending ? 'Placing order…' : 'Place order'}
      </button>
    </form>
  );
}
