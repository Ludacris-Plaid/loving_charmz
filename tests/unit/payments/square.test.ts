import { createHmac } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SquareConfig } from '@/lib/payments/config';
import {
  confirmSquareOrder,
  createSquareSession,
  parseSquareWebhookEvent,
  verifySquareWebhookSignature,
} from '@/lib/payments/square';

const config: SquareConfig = {
  mode: 'sandbox',
  baseUrl: 'https://connect.squareupsandbox.com',
  accessToken: 'square-token',
  locationId: 'LOCATION-1',
  webhookSignatureKey: 'signature-key',
  apiVersion: '2025-01-23',
};

const fetchMock = vi.fn();

function jsonResponse(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(body) };
}

const sessionInput = {
  orderId: '11111111-2222-3333-4444-555555555555',
  reference: 'LC-11111111',
  amount: { value: '69.39', currency: 'USD' },
  returnUrl: 'https://shop.test/api/payments/square/return/11111111-2222-3333-4444-555555555555',
  cancelUrl: 'https://shop.test/api/payments/square/return/11111111-2222-3333-4444-555555555555',
};

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

describe('createSquareSession', () => {
  it('creates a hosted checkout link in minor units', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        payment_link: {
          id: 'LINK-1',
          order_id: 'SQUARE-ORDER-1',
          url: 'https://square.link/u/abc123',
        },
      }),
    );

    const session = await createSquareSession(config, sessionInput);

    expect(session.providerOrderId).toBe('SQUARE-ORDER-1');
    expect(session.redirectUrl).toBe('https://square.link/u/abc123');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://connect.squareupsandbox.com/v2/online-checkout/payment-links');
    expect(init.headers.Authorization).toBe('Bearer square-token');
    expect(init.headers['Square-Version']).toBe('2025-01-23');

    const body = JSON.parse(init.body);
    expect(body.idempotency_key).toBe(`lc-order-${sessionInput.orderId}`);
    expect(body.quick_pay.price_money).toEqual({ amount: 6939, currency: 'USD' });
    expect(body.quick_pay.location_id).toBe('LOCATION-1');
    expect(body.checkout_options.redirect_url).toBe(sessionInput.returnUrl);
  });

  it('refuses a link that is not https', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ payment_link: { order_id: 'SQUARE-ORDER-1', url: 'http://insecure.test/pay' } }),
    );

    await expect(createSquareSession(config, sessionInput)).rejects.toMatchObject({
      code: 'missing_checkout_link',
    });
  });
});

describe('confirmSquareOrder', () => {
  it('reports a completed order as paid', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        order: {
          id: 'SQUARE-ORDER-1',
          state: 'COMPLETED',
          tenders: [{ id: 'TENDER-1', payment_id: 'PAYMENT-1', amount_money: { amount: 6939, currency: 'USD' } }],
        },
      }),
    );

    const confirmation = await confirmSquareOrder(config, 'SQUARE-ORDER-1');

    expect(confirmation.status).toBe('paid');
    expect(confirmation.providerTransactionId).toBe('PAYMENT-1');
    expect(confirmation.amount).toEqual({ value: '69.39', currency: 'USD' });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://connect.squareupsandbox.com/v2/orders/SQUARE-ORDER-1');
    expect(init.method).toBe('GET');
  });

  it('reports an open order as pending and a cancelled one as failed', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ order: { id: 'SQUARE-ORDER-1', state: 'OPEN' } }));
    await expect(confirmSquareOrder(config, 'SQUARE-ORDER-1')).resolves.toMatchObject({ status: 'pending' });

    fetchMock.mockResolvedValueOnce(jsonResponse({ order: { id: 'SQUARE-ORDER-2', state: 'CANCELED' } }));
    await expect(confirmSquareOrder(config, 'SQUARE-ORDER-2')).resolves.toMatchObject({ status: 'failed' });
  });
});

describe('verifySquareWebhookSignature', () => {
  const body = JSON.stringify({ type: 'payment.updated' });
  const notificationUrl = 'https://shop.test/api/webhooks/square';

  it('accepts a signature computed over the notification URL and raw body', () => {
    const signature = createHmac('sha256', 'signature-key').update(notificationUrl + body).digest('base64');

    expect(
      verifySquareWebhookSignature(config, { signature, notificationUrl, rawBody: body }),
    ).toBe(true);
  });

  it('rejects a tampered body', () => {
    const signature = createHmac('sha256', 'signature-key').update(notificationUrl + body).digest('base64');

    expect(
      verifySquareWebhookSignature(config, {
        signature,
        notificationUrl,
        rawBody: JSON.stringify({ type: 'payment.updated', extra: 'tampered' }),
      }),
    ).toBe(false);
  });

  it('rejects everything when no signature key is configured', () => {
    expect(
      verifySquareWebhookSignature(
        { ...config, webhookSignatureKey: null },
        { signature: 'anything', notificationUrl, rawBody: body },
      ),
    ).toBe(false);
  });
});

describe('parseSquareWebhookEvent', () => {
  it('maps a completed payment onto the Square order id', () => {
    const event = parseSquareWebhookEvent({
      type: 'payment.updated',
      data: {
        object: {
          payment: {
            id: 'PAYMENT-1',
            order_id: 'SQUARE-ORDER-1',
            status: 'COMPLETED',
            amount_money: { amount: 6939, currency: 'USD' },
          },
        },
      },
    });

    expect(event).toMatchObject({
      provider: 'square',
      kind: 'paid',
      providerOrderId: 'SQUARE-ORDER-1',
      providerTransactionId: 'PAYMENT-1',
      amount: { value: '69.39', currency: 'USD' },
    });
  });

  it('maps a failed payment and a refund', () => {
    const failed = parseSquareWebhookEvent({
      type: 'payment.updated',
      data: { object: { payment: { id: 'PAYMENT-2', order_id: 'SQUARE-ORDER-2', status: 'FAILED' } } },
    });
    expect(failed.kind).toBe('failed');

    const refunded = parseSquareWebhookEvent({
      type: 'refund.updated',
      data: {
        object: {
          refund: { id: 'REFUND-1', order_id: 'SQUARE-ORDER-1', amount_money: { amount: 6939, currency: 'USD' } },
        },
      },
    });
    expect(refunded.kind).toBe('refunded');
    expect(refunded.providerOrderId).toBe('SQUARE-ORDER-1');
  });
});
