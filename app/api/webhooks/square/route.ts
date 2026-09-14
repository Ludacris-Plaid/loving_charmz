import { NextResponse } from 'next/server';

import { isWebhookConfigured, verifyAndParseWebhook } from '@/lib/payments';
import { reconcileWebhookEvent } from '@/lib/payments/reconcile';
import { getSiteUrl } from '@/lib/payments/site';

export const dynamic = 'force-dynamic';

/**
 * Square webhook receiver (payment.*, order.*, refund.*).
 *
 * Square signs the notification URL plus the raw body, so the body is read as
 * text and never re-serialised before verification.
 */
export async function POST(request: Request) {
  if (!isWebhookConfigured('square')) {
    return NextResponse.json(
      {
        error:
          'Square webhooks are not configured. Set SQUARE_WEBHOOK_SIGNATURE_KEY to accept events.',
      },
      { status: 503 },
    );
  }

  const rawBody = await request.text();
  const notificationUrl = `${(await getSiteUrl()).replace(/\/+$/, '')}/api/webhooks/square`;

  let verification;
  try {
    verification = await verifyAndParseWebhook({
      provider: 'square',
      headers: request.headers,
      rawBody,
      notificationUrl,
    });
  } catch (error) {
    console.error('[square webhook] verification failed', error);
    return NextResponse.json({ error: 'verification_failed' }, { status: 400 });
  }

  if (!verification.ok) {
    const status = verification.reason === 'invalid_signature' ? 401 : 400;
    return NextResponse.json({ error: verification.reason }, { status });
  }

  try {
    const result = await reconcileWebhookEvent(verification.event);
    if (!result.matched && result.kind !== 'ignored') {
      console.warn('[square webhook] unmatched event', verification.event.providerOrderId, result.detail);
    }
    return NextResponse.json({ received: true, ...result });
  } catch (error) {
    console.error('[square webhook] reconciliation failed', error);
    return NextResponse.json({ error: 'reconciliation_failed' }, { status: 500 });
  }
}
