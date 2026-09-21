import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * processSquarePayment (embedded Square card flow).
 *
 * The critical property under test: the charged amount comes from the order
 * row on the server, never from the request body, so a tampered client cannot
 * buy a $100 order for a cent.
 */

const state = vi.hoisted(() => ({
  user: { id: 'user-1', email: 'tracy@example.com' } as { id: string; email: string } | null,
  order: {
    id: 'order-1',
    user_id: 'user-1',
    payment_status: 'awaiting_payment',
    total: 64.8,
    discount_code: null,
    shipping_address: null,
  } as Record<string, unknown> | null,
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: state.order, error: null }),
          }),
        }),
      }),
    }),
  }),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: state.order, error: null }),
        }),
      }),
    }),
  }),
}));

vi.mock('@/lib/cart/guest', () => ({
  readGuestCartToken: async () => null,
}));

const chargeCardToken = vi.hoisted(() => vi.fn());
const recordDirectCharge = vi.hoisted(() => vi.fn());

vi.mock('@/lib/payments', () => ({
  chargeCardToken,
  requirePaymentMethod: vi.fn(() => ({ id: 'card', provider: 'square' })),
  startPaymentSession: vi.fn(),
}));
vi.mock('@/lib/payments/ledger', () => ({ recordDirectCharge }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

beforeEach(() => {
  state.user = { id: 'user-1', email: 'tracy@example.com' };
  state.order = { id: 'order-1', user_id: 'user-1', payment_status: 'awaiting_payment', total: 64.8, discount_code: null };
  chargeCardToken.mockReset();
  recordDirectCharge.mockReset();
});

describe('processSquarePayment', () => {
  it('charges the server-side order total and ignores a tampered client amount', async () => {
    chargeCardToken.mockResolvedValue({ providerTransactionId: 'PAY-1', status: 'COMPLETED', raw: {} });

    const { processSquarePayment } = await import('@/lib/checkout/actions');
    const result = await processSquarePayment({
      sourceId: 'cnon:card',
      orderId: 'order-1',
      amount: 0.01, // tampered
      currency: 'CAD',
    });

    expect(result.success).toBe(true);
    expect(chargeCardToken).toHaveBeenCalledWith({
      method: 'card',
      sourceId: 'cnon:card',
      orderId: 'order-1',
      amount: { value: '64.80', currency: 'CAD' },
    });
    expect(recordDirectCharge).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: 'order-1', amount: 64.8, provider: 'square' }),
    );
  });

  it('short-circuits an already-paid order without charging again', async () => {
    state.order = { ...state.order!, payment_status: 'paid' };

    const { processSquarePayment } = await import('@/lib/checkout/actions');
    const result = await processSquarePayment({ sourceId: 'cnon:card', orderId: 'order-1' });

    expect(result.success).toBe(true);
    expect(chargeCardToken).not.toHaveBeenCalled();
    expect(recordDirectCharge).not.toHaveBeenCalled();
  });

  it('refuses an order that does not belong to the signed-in user', async () => {
    state.order = null;

    const { processSquarePayment } = await import('@/lib/checkout/actions');
    const result = await processSquarePayment({ sourceId: 'cnon:card', orderId: 'order-1' });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not found/i);
    expect(chargeCardToken).not.toHaveBeenCalled();
  });

  it('allows guest checkout for orders without a user_id', async () => {
    state.user = null;
    state.order = {
      id: 'order-1',
      user_id: null,
      payment_status: 'awaiting_payment',
      total: 64.8,
      discount_code: null,
      shipping_address: { email: 'guest@example.com' },
    };
    chargeCardToken.mockResolvedValue({ providerTransactionId: 'PAY-1', status: 'COMPLETED', raw: {} });

    const { processSquarePayment } = await import('@/lib/checkout/actions');
    const result = await processSquarePayment({ sourceId: 'cnon:card', orderId: 'order-1' });

    expect(result.success).toBe(true);
    expect(chargeCardToken).toHaveBeenCalled();
  });

  it('reports a non-completed charge as a failure without settling', async () => {
    chargeCardToken.mockResolvedValue({ providerTransactionId: 'PAY-1', status: 'PENDING', raw: {} });

    const { processSquarePayment } = await import('@/lib/checkout/actions');
    const result = await processSquarePayment({ sourceId: 'cnon:card', orderId: 'order-1' });

    expect(result.success).toBe(false);
    expect(recordDirectCharge).not.toHaveBeenCalled();
  });
});
