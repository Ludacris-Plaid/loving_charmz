'use client';

import { useState, useEffect, useTransition } from 'react';
import { Input } from '@/components/ui/Input';
import { createCheckoutAction } from '@/lib/checkout/actions';
import { validateDiscountCode } from '@/lib/checkout/discount';
import { getSquareClientConfig, type SquareClientConfig } from '@/lib/payments/config-client';
import { SquareCardForm } from './SquareCardForm';

type PaymentMethodOption = {
  id: 'paypal' | 'card';
  label: string;
  description: string;
  configured: boolean;
};

type Props = {
  defaultEmail: string;
  methods: PaymentMethodOption[];
  totalAmount: number;
};

export function CheckoutForm({ defaultEmail, methods, totalAmount }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [discountInput, setDiscountInput] = useState('');
  const [discountStatus, setDiscountStatus] = useState<'idle' | 'checking' | 'applied' | 'error'>('idle');
  const [discountMsg, setDiscountMsg] = useState<string | null>(null);
  const [discountData, setDiscountData] = useState<{ code: string; type: string; value: number } | null>(null);
  const [squareConfig, setSquareConfig] = useState<SquareClientConfig | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<string>('card');
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const available = methods.filter((method) => method.configured);
  const paymentsUnavailable = available.length === 0;

  // Load Square config on mount
  useEffect(() => {
    getSquareClientConfig().then(setSquareConfig);
  }, []);

  const handleApplyDiscount = () => {
    if (!discountInput.trim()) return;
    setDiscountStatus('checking');
    setDiscountMsg(null);
    validateDiscountCode(discountInput.trim()).then((res) => {
      if (res.valid) {
        setDiscountStatus('applied');
        setDiscountData({ code: res.code!, type: res.discount_type!, value: res.discount_value! });
        setDiscountMsg(null);
      } else {
        setDiscountStatus('error');
        setDiscountMsg(res.error || 'Invalid code');
        setDiscountData(null);
      }
    });
  };

  const handleSubmit = async (formData: FormData) => {
    setError(null);
    if (discountData) {
      formData.set('discountCode', discountData.code);
    }
    
    // For embedded Square payments, we need to create the order first,
    // then show the card form
    if (selectedPayment === 'card' && squareConfig) {
      startTransition(async () => {
        const res = await createCheckoutAction(formData);
        if (res.error) {
          setError(res.error);
        } else if (res.orderId) {
          // Order created, now show the card form
          setOrderId(res.orderId);
        } else {
          setError('We could not start the payment. Please try again.');
        }
      });
    } else {
      // For PayPal or other redirect-based payments
      startTransition(async () => {
        const res = await createCheckoutAction(formData);
        if (res.error) {
          setError(res.error);
        } else if (res.redirectUrl) {
          window.location.assign(res.redirectUrl);
        } else {
          setError('We could not start the payment. Please try again.');
        }
      });
    }
  };

  const handlePaymentSuccess = (result: { orderId: string }) => {
    setPaymentSuccess(true);
    // Redirect to confirmation page
    window.location.href = `/checkout/confirmation?id=${result.orderId}`;
  };

  const handlePaymentError = (errorMsg: string) => {
    setError(errorMsg);
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
        <h2 className="font-display text-lg font-semibold text-plum-900 mb-4">Discount code</h2>
        {discountStatus === 'applied' && discountData ? (
          <div className="flex items-center gap-3">
            <span className="badge-plum">{discountData.code}</span>
            <span className="text-sm text-plum-700 font-medium">
              {discountData.type === 'percentage' ? `${discountData.value}% off` : `$${discountData.value.toFixed(2)} off`}
            </span>
            <button
              type="button"
              onClick={() => { setDiscountData(null); setDiscountInput(''); setDiscountStatus('idle'); }}
              className="text-xs text-ink-500 hover:text-red-600 motion-base ml-auto"
            >
              Remove
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Input
              label=""
              name="discountCode"
              placeholder="Enter code"
              value={discountInput}
              onChange={(e) => setDiscountInput(e.target.value)}
              className="flex-1"
            />
            <button
              type="button"
              onClick={handleApplyDiscount}
              disabled={discountStatus === 'checking' || !discountInput.trim()}
              className="btn-outline self-end px-5 py-2.5 text-xs"
            >
              {discountStatus === 'checking' ? 'Checking…' : 'Apply'}
            </button>
          </div>
        )}
        {discountMsg && <p className="text-xs text-red-600 mt-2" role="alert">{discountMsg}</p>}
      </section>

      <section className="surface-card p-6">
        <h2 className="font-display text-lg font-semibold text-plum-900 mb-4">Payment</h2>
        {paymentsUnavailable ? (
          <p
            role="alert"
            className="rounded-md border border-cream-300 bg-cream-100 px-4 py-3 text-sm text-ink-800"
          >
            Online payments are not configured for this environment yet, so checkout cannot take payment.
            No order will be placed. Please contact us and we will arrange your keepsake directly.
          </p>
        ) : (
          <div className="space-y-3">
            {available.map((option) => (
              <label
                key={option.id}
                className="flex items-start gap-3 p-4 rounded-md border border-cream-300 cursor-pointer hover:border-plum-500 motion-base"
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value={option.id}
                  checked={selectedPayment === option.id}
                  onChange={() => setSelectedPayment(option.id)}
                  className="mt-0.5 accent-plum-700"
                />
                <span>
                  <span className="block text-ink-800">{option.label}</span>
                  <span className="block text-xs text-ink-500 mt-1">{option.description}</span>
                </span>
              </label>
            ))}
            
            {/* Show embedded card form when card is selected and Square is configured */}
            {selectedPayment === 'card' && squareConfig && orderId ? (
              <div className="mt-4 p-4 border border-cream-300 rounded-md">
                <p className="text-sm text-ink-600 mb-4">
                  Enter your card details below. Your card information is securely processed by Square and never touches our servers.
                </p>
                <SquareCardForm
                  applicationId={squareConfig.applicationId}
                  locationId={squareConfig.locationId}
                  amount={totalAmount}
                  currency="CAD"
                  orderId={orderId}
                  onPaymentSuccess={handlePaymentSuccess}
                  onPaymentError={handlePaymentError}
                />
              </div>
            ) : selectedPayment === 'card' && squareConfig ? (
              <p className="text-xs text-ink-500 mt-2">
                Click "Continue to payment" to enter your card details securely.
              </p>
            ) : (
              <p className="text-xs text-ink-500">
                You will be redirected to your payment provider to complete the transaction. No card details
                are stored on this site.
              </p>
            )}
          </div>
        )}
      </section>

      {error && (
        <p className="text-sm text-red-600" role="alert">{error}</p>
      )}

      <button
        type="submit"
        disabled={pending || paymentsUnavailable}
        className="btn-plum w-full py-3 text-sm disabled:opacity-60"
      >
        {pending ? 'Opening secure payment…' : 'Continue to payment'}
      </button>
    </form>
  );
}
