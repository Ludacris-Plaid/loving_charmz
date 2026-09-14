import { NextResponse } from 'next/server';

import { isWebhookConfigured, verifyAndParseWebhook } from '@/lib/payments';
import { reconcileWebhookEvent } from '@/lib/payments/reconcile';
import { getSiteUrl } from '@/lib/payments/site';

export const dynamic = 'force-dynamic';

/**
 * PayPal webhook receiver (PAYMENT.CAPTURE.*).
 *
 * Verification is mandatory: an unverified "capture completed" post would let
 * anyone mark their own order paid, so an unconfigured or unsigned request is
 * rejected outright instead of being trusted.
 */
export async function POST(request: Request) {
  if (!isWebhookConfigured('paypal')) {
    return NextResponse.json(
      { error: 'PayPal webhooks are not configured. Set PAYPAL_WEBHOOK_ID to accept events.' },
      { status: 503 },
    );
  }

  const rawBody = await request.text();
  const notificationUrl = `${(await getSiteUrl()).replace(/\/+$/, '')}/api/webhooks/paypal`;

  let verification;
  try {
    verification = await verifyAndParseWebhook({
      provider: 'paypal',
      headers: request.headers,
      rawBody,
      notificationUrl,
    });
  } catch (error) {
    console.error('[paypal webhook] verification failed', error);
    return NextResponse.json({ error: 'verification_failed' }, { status: 400 });
  }

  if (!verification.ok) {
    const status = verification.reason === 'invalid_signature' ? 401 : 400;
    return NextResponse.json({ error: verification.reason }, { status });
  }

  try {
    const result = await reconcileWebhookEvent(verification.event);
    if (!result.matched && result.kind !== 'ignored') {
      console.warn('[paypal webhook] unmatched event', verification.event.providerOrderId, result.detail);
    }
    // 200 for anything verified, including unmatched events: PayPal retries
    // non-2xx responses, and a retry cannot fix an event we cannot map.
    return NextResponse.json({ received: true, ...result });
  } catch (error) {
    console.error('[paypal webhook] reconciliation failed', error);
    return NextResponse.json({ error: 'reconciliation_failed' }, { status: 500 });
  }
}
