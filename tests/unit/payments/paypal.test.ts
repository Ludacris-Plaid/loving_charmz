import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PayPalConfig } from '@/lib/payments/config';
import {
  capturePayPalOrder,
  createPayPalSession,
  getPayPalAccessToken,
  parsePayPalWebhookEvent,
  resetPayPalTokenCache,
  verifyPayPalWebhookSignature,
} from '@/lib/payments/paypal';

const config: PayPalConfig = {
  mode: 'sandbox',
  baseUrl: 'https://api-m.sandbox.paypal.com',
  clientId: 'client-id',
  clientSecret: 'client-secret',
  webhookId: null,
};

const fetchMock = vi.fn();

function jsonResponse(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(body) };
}

function tokenResponse() {
  return jsonResponse({ access_token: 'access-token', expires_in: 3200 });
}

const sessionInput = {
  orderId: '11111111-2222-3333-4444-555555555555',
  reference: 'LC-11111111',
  amount: { value: '69.39', currency: 'USD' },
  returnUrl: 'https://shop.test/api/payments/paypal/capture/11111111-2222-3333-4444-555555555555',
  cancelUrl: 'https://shop.test/api/payments/paypal/cancel/11111111-2222-3333-4444-555555555555',
};

beforeEach(() => {
  resetPayPalTokenCache();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

describe('getPayPalAccessToken', () => {
  it('authenticates with basic credentials and caches the token', async () => {
    fetchMock.mockResolvedValueOnce(tokenResponse());

    const first = await getPayPalAccessToken(config);
    const second = await getPayPalAccessToken(config);

    expect(first).toBe('access-token');
    expect(second).toBe('access-token');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api-m.sandbox.paypal.com/v1/oauth2/token');
    expect(init.headers.Authorization).toBe(`Basic ${Buffer.from('client-id:client-secret').toString('base64')}`);
    expect(init.body).toBe('grant_type=client_credentials');
  });
});

describe('createPayPalSession', () => {
  it('creates a capture-intent order and returns the approval link', async () => {
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(
        jsonResponse({
          id: 'PAYPAL-ORDER-1',
          status: 'PAYER_ACTION_REQUIRED',
          links: [
            { rel: 'self', href: 'https://api-m.sandbox.paypal.com/v2/checkout/orders/PAYPAL-ORDER-1' },
            { rel: 'payer-action', href: 'https://www.sandbox.paypal.com/checkoutnow?token=PAYPAL-ORDER-1' },
          ],
        }),
      );

    const session = await createPayPalSession(config, sessionInput);

    expect(session.providerOrderId).toBe('PAYPAL-ORDER-1');
    expect(session.redirectUrl).toBe('https://www.sandbox.paypal.com/checkoutnow?token=PAYPAL-ORDER-1');
    expect(session.mode).toBe('sandbox');

    const [, init] = fetchMock.mock.calls[1];
    const body = JSON.parse(init.body);
    expect(body.intent).toBe('CAPTURE');
    expect(body.purchase_units[0].custom_id).toBe(sessionInput.orderId);
    expect(body.purchase_units[0].amount).toEqual({ currency_code: 'USD', value: '69.39' });
    expect(body.payment_source.paypal.experience_context.return_url).toBe(sessionInput.returnUrl);
  });

  it('falls back to the legacy approve link', async () => {
    fetchMock.mockResolvedValueOnce(tokenResponse()).mockResolvedValueOnce(
      jsonResponse({
        id: 'PAYPAL-ORDER-2',
        status: 'CREATED',
        links: [{ rel: 'approve', href: 'https://www.sandbox.paypal.com/checkoutnow?token=PAYPAL-ORDER-2' }],
      }),
    );

    const session = await createPayPalSession(config, sessionInput);
    expect(session.redirectUrl).toContain('checkoutnow?token=PAYPAL-ORDER-2');
  });

  it('fails loudly when PayPal returns no approval link', async () => {
    fetchMock.mockResolvedValueOnce(tokenResponse()).mockResolvedValueOnce(
      jsonResponse({ id: 'PAYPAL-ORDER-3', status: 'CREATED', links: [] }),
    );

    await expect(createPayPalSession(config, sessionInput)).rejects.toMatchObject({
      code: 'missing_approval_link',
    });
  });

  it('surfaces PayPal error payloads with their code', async () => {
    fetchMock.mockResolvedValueOnce(tokenResponse()).mockResolvedValueOnce(
      jsonResponse({ name: 'INVALID_REQUEST', message: 'Something went wrong' }, 400),
    );

    await expect(createPayPalSession(config, sessionInput)).rejects.toMatchObject({
      code: 'INVALID_REQUEST',
      message: 'Something went wrong',
    });
  });
});

describe('capturePayPalOrder', () => {
  const capturePayload = {
    id: 'PAYPAL-ORDER-1',
    status: 'COMPLETED',
    payer: { email_address: 'shopper@example.com' },
    purchase_units: [
      {
        custom_id: sessionInput.orderId,
        payments: {
          captures: [
            {
              id: 'CAPTURE-1',
              status: 'COMPLETED',
              amount: { value: '69.39', currency_code: 'USD' },
              supplementary_data: { related_ids: { order_id: 'PAYPAL-ORDER-1' } },
            },
          ],
        },
      },
    ],
  };

  it('captures and reports the settled amount', async () => {
    fetchMock.mockResolvedValueOnce(tokenResponse()).mockResolvedValueOnce(jsonResponse(capturePayload));

    const confirmation = await capturePayPalOrder(config, 'PAYPAL-ORDER-1');

    expect(confirmation.status).toBe('paid');
    expect(confirmation.orderId).toBe(sessionInput.orderId);
    expect(confirmation.providerTransactionId).toBe('CAPTURE-1');
    expect(confirmation.amount).toEqual({ value: '69.39', currency: 'USD' });
    expect(confirmation.payerEmail).toBe('shopper@example.com');

    const [url] = fetchMock.mock.calls[1];
    expect(url).toBe('https://api-m.sandbox.paypal.com/v2/checkout/orders/PAYPAL-ORDER-1/capture');
  });

  it('reads the order back when it was already captured', async () => {
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(
        jsonResponse({ name: 'ORDER_ALREADY_CAPTURED', message: 'Order already captured', details: [] }, 422),
      )
      .mockResolvedValueOnce(jsonResponse(capturePayload));

    const confirmation = await capturePayPalOrder(config, 'PAYPAL-ORDER-1');

    expect(confirmation.status).toBe('paid');
    const [url, init] = fetchMock.mock.calls[2];
    expect(url).toBe('https://api-m.sandbox.paypal.com/v2/checkout/orders/PAYPAL-ORDER-1');
    expect(init.method).toBe('GET');
  });

  it('reports a declined capture as failed', async () => {
    fetchMock.mockResolvedValueOnce(tokenResponse()).mockResolvedValueOnce(
      jsonResponse({
        id: 'PAYPAL-ORDER-1',
        status: 'COMPLETED',
        purchase_units: [{ payments: { captures: [{ id: 'CAPTURE-1', status: 'DECLINED' }] } }],
      }),
    );

    const confirmation = await capturePayPalOrder(config, 'PAYPAL-ORDER-1');
    expect(confirmation.status).toBe('failed');
  });
});

describe('verifyPayPalWebhookSignature', () => {
  const headers = new Headers({
    'paypal-transmission-id': 'tid',
    'paypal-transmission-time': '2026-09-13T00:00:00Z',
    'paypal-transmission-sig': 'sig',
    'paypal-cert-url': 'https://api.paypal.com/cert',
    'paypal-auth-algo': 'SHA256withRSA',
  });

  it('refuses to verify when no webhook id is configured', async () => {
    await expect(verifyPayPalWebhookSignature(config, headers, {})).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('accepts a SUCCESS verification response', async () => {
    fetchMock.mockResolvedValueOnce(tokenResponse()).mockResolvedValueOnce(
      jsonResponse({ verification_status: 'SUCCESS' }),
    );

    await expect(
      verifyPayPalWebhookSignature({ ...config, webhookId: 'WEBHOOK-1' }, headers, { id: 'evt' }),
    ).resolves.toBe(true);
  });

  it('rejects a FAILURE verification response', async () => {
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(jsonResponse({ verification_status: 'FAILURE' }));

    await expect(
      verifyPayPalWebhookSignature({ ...config, webhookId: 'WEBHOOK-1' }, headers, { id: 'evt' }),
    ).resolves.toBe(false);
  });
});

describe('parsePayPalWebhookEvent', () => {
  it('maps a completed capture onto our order id', () => {
    const event = parsePayPalWebhookEvent({
      event_type: 'PAYMENT.CAPTURE.COMPLETED',
      resource: {
        id: 'CAPTURE-1',
        custom_id: sessionInput.orderId,
        amount: { value: '69.39', currency_code: 'USD' },
        supplementary_data: { related_ids: { order_id: 'PAYPAL-ORDER-1' } },
      },
    });

    expect(event.kind).toBe('paid');
    expect(event.orderId).toBe(sessionInput.orderId);
    expect(event.providerOrderId).toBe('PAYPAL-ORDER-1');
    expect(event.providerTransactionId).toBe('CAPTURE-1');
  });

  it('resolves a refund to the capture that was actually charged', () => {
    const event = parsePayPalWebhookEvent({
      event_type: 'PAYMENT.CAPTURE.REFUNDED',
      resource: {
        id: 'REFUND-1',
        links: [
          { rel: 'up', href: 'https://api-m.sandbox.paypal.com/v2/payments/captures/CAPTURE-1' },
        ],
      },
    });

    expect(event.kind).toBe('refunded');
    expect(event.providerTransactionId).toBe('CAPTURE-1');
  });

  it('ignores event types that need no order change', () => {
    const event = parsePayPalWebhookEvent({ event_type: 'CHECKOUT.ORDER.APPROVED', resource: { id: 'PAYPAL-ORDER-1' } });
    expect(event.kind).toBe('ignored');
  });
});
