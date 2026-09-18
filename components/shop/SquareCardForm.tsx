'use client';

import { useState } from 'react';
import { CreditCard, PaymentForm } from 'react-square-web-payments-sdk';
import { processSquarePayment } from '@/lib/checkout/actions';

type Props = {
  applicationId: string;
  locationId: string;
  amount: number;
  currency: string;
  orderId: string;
  onPaymentSuccess: (result: { orderId: string }) => void;
  onPaymentError: (error: string) => void;
};

export function SquareCardForm({
  applicationId,
  locationId,
  amount,
  currency,
  orderId,
  onPaymentSuccess,
  onPaymentError,
}: Props) {
  const [processing, setProcessing] = useState(false);

  const handleTokenize = async (tokenResult: any) => {
    if (tokenResult.status === 'OK') {
      setProcessing(true);
      try {
        const result = await processSquarePayment({
          sourceId: tokenResult.token,
          orderId,
          amount,
          currency,
        });

        if (result.success) {
          onPaymentSuccess({ orderId: result.orderId! });
        } else {
          onPaymentError(result.error || 'Payment failed');
        }
      } catch (error) {
        onPaymentError('An unexpected error occurred. Please try again.');
      } finally {
        setProcessing(false);
      }
    } else {
      onPaymentError('Card tokenization failed. Please check your card details.');
    }
  };

  return (
    <div className="space-y-4">
      <PaymentForm
        applicationId={applicationId}
        locationId={locationId}
        cardTokenizeResponseReceived={handleTokenize}
      >
        <CreditCard
          buttonProps={{
            isLoading: processing,
            className: 'btn-plum w-full py-3 text-sm',
          }}
        >
          {processing ? 'Processing payment…' : `Pay $${amount.toFixed(2)} ${currency}`}
        </CreditCard>
      </PaymentForm>
    </div>
  );
}
