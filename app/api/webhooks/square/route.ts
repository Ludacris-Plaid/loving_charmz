import { NextResponse } from 'next/server';

import { isWebhookConfigured, verifyAndParseWebhook } from '@/lib/payments';
import { reconcileWebhookEvent } from '@/lib/payments/reconcile';

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
  // Square signs the exact URL it POSTs to. Apex 308-redirects to www on Vercel
  // and Square does not follow redirects, so the subscription targets www while
  // NEXT_PUBLIC_SITE_URL is the apex. Deriving the URL from the request's own
  // host keeps the signature valid for whichever host Square actually delivers
  // to (www today, apex if the redirect is ever removed, or a preview URL).
  const requestUrl = new URL(request.url);
  const forwardedHost = request.headers.get('x-forwarded-host') ?? requestUrl.host;
  const forwardedProto = request.headers.get('x-forwarded-proto') ?? requestUrl.protocol.replace(/:$/, '');
  const notificationUrl = `${forwardedProto}://${forwardedHost}/api/webhooks/square`;

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
