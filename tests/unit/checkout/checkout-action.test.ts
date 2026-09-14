import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => {
  const state = {
    user: { id: 'user-1', email: 'tracy@example.com' } as { id: string; email: string } | null,
    cart: { id: 'cart-1' } as { id: string } | null,
    cartItems: [
      {
        id: 'ci-1',
        quantity: 1,
        product_id: 'p-1',
        variant_id: 'v-1',
        product: { name: 'Apex Cuff', base_price: 55 },
        variant: { name: 'Silver', price_adjustment: 5 },
      },
    ] as Record<string, unknown>[],
    orders: [] as Record<string, unknown>[],
    orderItems: [] as Record<string, unknown>[],
    transactions: [] as Record<string, unknown>[],
    deletedOrders: [] as string[],
    discounts: [] as Record<string, unknown>[],
  };

  function builderFor(table: string) {
    let op: string | null = null;
    let payload: any = null;
    const filters: [string, unknown][] = [];

    function settle() {
      if (table === 'carts' && op === 'select') return { data: state.cart, error: null };
      if (table === 'cart_items' && op === 'select') return { data: state.cartItems, error: null };
      if (table === 'orders' && op === 'insert') {
        const row = { id: 'order-1', ...payload };
        state.orders.push(row);
        return { data: { id: row.id }, error: null };
      }
      if (table === 'orders' && op === 'delete') {
        state.deletedOrders.push(String(filters[0]?.[1]));
        return { data: null, error: null };
      }
      if (table === 'order_items' && op === 'insert') {
        state.orderItems.push(...(Array.isArray(payload) ? payload : [payload]));
        return { data: null, error: null };
      }
      if (table === 'payment_transactions' && op === 'insert') {
        const row = { id: `txn-${state.transactions.length + 1}`, ...payload };
        state.transactions.push(row);
        return { data: row, error: null };
      }
      if (table === 'discounts' && op === 'select') {
        const code = String(filters.find(([c]) => c === 'code')?.[1] ?? '');
        const row = state.discounts.find((d) => String(d.code).toLowerCase() === code.toLowerCase());
        return { data: row ?? null, error: row ? null : { message: 'not found' } };
      }
      if (table === 'discounts' && op === 'update') {
        const code = String(filters.find(([c]) => c === 'code')?.[1] ?? '');
        const row = state.discounts.find((d) => String(d.code).toLowerCase() === code.toLowerCase());
        if (row) Object.assign(row, payload);
        return { data: null, error: null };
      }
      if (table === 'payment_transactions' && op === 'update') {
        const txn = state.transactions.find((t) => t.id === String(filters[0]?.[1]));
        if (txn) Object.assign(txn, payload);
        return { data: null, error: null };
      }
      return { data: null, error: null };
    }

    const builder: any = {
      select: () => {
        op = op ?? 'select';
        return builder;
      },
      insert: (row: any) => {
        op = 'insert';
        payload = row;
        return builder;
      },
      update: (row: any) => {
        op = 'update';
        payload = row;
        return builder;
      },
      delete: () => {
        op = 'delete';
        return builder;
      },
      eq: (column: string, value: unknown) => {
        filters.push([column, value]);
        return builder;
      },
      ilike: (column: string, value: unknown) => {
        filters.push([column, value]);
        return builder;
      },
      order: () => builder,
      limit: () => builder,
      maybeSingle: async () => settle(),
      single: async () => settle(),
      then: (resolve: any, reject: any) => Promise.resolve(settle()).then(resolve, reject),
    };
    return builder;
  }

  return {
    state,
    builderFor,
    serverClient: () => ({
      auth: { getUser: async () => ({ data: { user: state.user } }) },
      from: builderFor,
    }),
  };
});

vi.mock('@/lib/supabase/server', () => ({ createClient: async () => db.serverClient() }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => ({ from: db.builderFor }) }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/headers', () => ({
  headers: async () => new Headers({ host: 'shop.test', 'x-forwarded-proto': 'https' }),
}));

const fetchMock = vi.fn();

function jsonResponse(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(body) };
}

function checkoutForm(paymentMethod = 'paypal') {
  const formData = new FormData();
  formData.set('firstName', 'Tracy');
  formData.set('lastName', 'Houtstra');
  formData.set('address', '1 Bond Street');
  formData.set('city', 'Edmonton');
  formData.set('state', 'AB');
  formData.set('zip', 'T5J 0N3');
  formData.set('email', 'tracy@example.com');
  formData.set('paymentMethod', paymentMethod);
  return formData;
}

function configurePayPal() {
  vi.stubEnv('PAYPAL_CLIENT_ID', 'real-client-id');
  vi.stubEnv('PAYPAL_CLIENT_SECRET', 'real-client-secret');
  vi.stubEnv('PAYPAL_MODE', 'sandbox');
}

function resetState() {
  db.state.orders = [];
  db.state.orderItems = [];
  db.state.transactions = [];
  db.state.deletedOrders = [];
  db.state.discounts = [];
  db.state.user = { id: 'user-1', email: 'tracy@example.com' };
  db.state.cart = { id: 'cart-1' };
}

beforeEach(() => {
  resetState();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('createCheckoutAction without payment configuration', () => {
  it('creates no order and no transaction', async () => {
    vi.stubEnv('PAYPAL_CLIENT_ID', 'your_sandbox_client_id');
    vi.stubEnv('PAYPAL_CLIENT_SECRET', 'your_sandbox_secret');

    const { createCheckoutAction } = await import('@/lib/checkout/actions');
    const result = await createCheckoutAction(checkoutForm());

    expect(result.error).toMatch(/not configured/i);
    expect(db.state.orders).toHaveLength(0);
    expect(db.state.orderItems).toHaveLength(0);
    expect(db.state.transactions).toHaveLength(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('createCheckoutAction with a configured provider', () => {
  it('creates the order alongside a live provider session', async () => {
    configurePayPal();
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ access_token: 'token', expires_in: 3200 }))
      .mockResolvedValueOnce(
        jsonResponse({
          id: 'PAYPAL-ORDER-1',
          status: 'PAYER_ACTION_REQUIRED',
          links: [{ rel: 'payer-action', href: 'https://www.sandbox.paypal.com/checkoutnow?token=PAYPAL-ORDER-1' }],
        }),
      );

    const { createCheckoutAction } = await import('@/lib/checkout/actions');
    const result = await createCheckoutAction(checkoutForm());

    expect(result.error).toBeUndefined();
    expect(result.orderId).toBe('order-1');
    expect(result.redirectUrl).toContain('checkoutnow?token=PAYPAL-ORDER-1');

    expect(db.state.orders).toHaveLength(1);
    expect(db.state.orders[0]).toMatchObject({
      user_id: 'user-1',
      payment_method: 'paypal',
      payment_status: 'awaiting_payment',
      subtotal: 60,
      shipping_cost: 0,
      total: 64.80,
    });

    expect(db.state.orderItems).toHaveLength(1);
    expect(db.state.orderItems[0]).toMatchObject({ product_name: 'Apex Cuff', unit_price: 60, quantity: 1 });

    expect(db.state.transactions).toHaveLength(1);
    expect(db.state.transactions[0]).toMatchObject({
      order_id: 'order-1',
      provider: 'paypal',
      provider_transaction_id: 'PAYPAL-ORDER-1',
      status: 'requires_action',
      amount: 64.80,
    });

    // The cart is not emptied until the payment is actually captured.
    expect(db.state.deletedOrders).toHaveLength(0);
  });

  it('rolls the order back when the provider rejects the session', async () => {
    configurePayPal();
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ access_token: 'token', expires_in: 3200 }))
      .mockResolvedValueOnce(jsonResponse({ name: 'INVALID_REQUEST', message: 'Bad request' }, 400));

    const { createCheckoutAction } = await import('@/lib/checkout/actions');
    const result = await createCheckoutAction(checkoutForm());

    expect(result.error).toMatch(/No order was created/i);
    expect(result.redirectUrl).toBeUndefined();
    expect(db.state.deletedOrders).toEqual(['order-1']);
    expect(db.state.transactions[0]).toMatchObject({ status: 'failed' });
  });

  it('rejects an incomplete shipping address before calling the provider', async () => {
    configurePayPal();
    const formData = checkoutForm();
    formData.set('city', '');

    const { createCheckoutAction } = await import('@/lib/checkout/actions');
    const result = await createCheckoutAction(formData);

    expect(result.error).toMatch(/required fields/i);
    expect(db.state.orders).toHaveLength(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refuses a card payment when only PayPal is configured', async () => {
    configurePayPal();

    const { createCheckoutAction } = await import('@/lib/checkout/actions');
    const result = await createCheckoutAction(checkoutForm('card'));

    expect(result.error).toMatch(/not configured/i);
    expect(db.state.orders).toHaveLength(0);
    expect(db.state.deletedOrders).toHaveLength(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('stores the canonical discount code on the order', async () => {
    configurePayPal();
    const { resetPayPalTokenCache } = await import('@/lib/payments/paypal');
    resetPayPalTokenCache();
    db.state.discounts = [
      { code: 'WELCOME10', discount_type: 'percentage', discount_value: 10, is_active: true },
    ];
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ access_token: 'token', expires_in: 3200 }))
      .mockResolvedValueOnce(
        jsonResponse({
          id: 'PAYPAL-ORDER-2',
          status: 'PAYER_ACTION_REQUIRED',
          links: [{ rel: 'payer-action', href: 'https://www.sandbox.paypal.com/checkoutnow?token=PAYPAL-ORDER-2' }],
        }),
      );

    const formData = checkoutForm();
    formData.set('discountCode', 'welcome10'); // lowercase on purpose
    const { createCheckoutAction } = await import('@/lib/checkout/actions');
    const result = await createCheckoutAction(formData);

    expect(result.error).toBeUndefined();
    expect(db.state.orders).toHaveLength(1);
    // Canonical uppercase code stored, discount applied off the $60 subtotal.
    expect(db.state.orders[0]).toMatchObject({ discount_code: 'WELCOME10', discount: 6 });
  });

  it('requires a signed-in shopper', async () => {
    db.state.user = null;

    const { createCheckoutAction } = await import('@/lib/checkout/actions');
    const result = await createCheckoutAction(checkoutForm());

    expect(result.error).toMatch(/sign in/i);
    expect(db.state.orders).toHaveLength(0);
  });
});
