import { describe, expect, it, vi, beforeEach } from 'vitest';

/**
 * Tests for the abandoned cart email recovery system.
 *
 * We mock Supabase admin client and Resend to test the detection
 * logic and email sending without hitting real services.
 */

// ---- Mocks ----

const state = vi.hoisted(() => ({
  carts: [] as any[],
  orders: [] as any[],
  abandonedEmails: [] as any[],
  users: [] as any[],
  sendResult: { error: null as any },
  _lastSendParams: null as any,
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      const builder: any = {
        _table: table,
        _filters: [] as { op: string; col: string; val: any }[],
        _selectCols: '*',
        select(cols?: string) {
          if (cols) builder._selectCols = cols;
          return builder;
        },
        eq(col: string, val: any) {
          builder._filters.push({ op: 'eq', col, val });
          return builder;
        },
        not(col: string, op: string, val: any) {
          builder._filters.push({ op: 'not', col, val });
          return builder;
        },
        is(col: string, val: any) {
          builder._filters.push({ op: 'is', col, val });
          return builder;
        },
        lt(col: string, val: any) {
          builder._filters.push({ op: 'lt', col, val });
          return builder;
        },
        gt(col: string, val: any) {
          builder._filters.push({ op: 'gt', col, val });
          return builder;
        },
        gte(col: string, val: any) {
          builder._filters.push({ op: 'gte', col, val });
          return builder;
        },
        in(col: string, vals: any[]) {
          builder._filters.push({ op: 'in', col, val: vals });
          return builder;
        },
        async single() {
          return builder._resolve({ single: true });
        },
        async maybeSingle() {
          return builder._resolve({ single: false });
        },
        then(resolve: any) {
          return resolve(builder._resolve({}));
        },
        insert(data: any) {
          builder._insertData = data;
          return builder;
        },
        update(data: any) {
          builder._updateData = data;
          return builder;
        },
        delete() {
          return builder;
        },
        async _resolve(opts: any) {
          let data: any = null;
          let error = null;

          if (table === 'carts') {
            const cartsWithItems = state.carts.filter((c: any) => {
              const hasItems = c.cart_items && c.cart_items.length > 0;
              const noUserId = builder._filters.some(
                (f: any) => f.op === 'is' && f.col === 'user_id' && f.val === null,
              );
              if (noUserId) return !c.user_id && hasItems;
              return c.user_id && hasItems;
            });
            data = cartsWithItems;
          } else if (table === 'orders') {
            data = state.orders;
          } else if (table === 'abandoned_cart_emails') {
            if (builder._insertData) {
              const record = {
                id: 'email-1',
                ...builder._insertData,
                unsubscribe_token: 'test-token-abc123',
                sent_at: new Date().toISOString(),
              };
              state.abandonedEmails.push(record);
              data = opts.single ? record : [record];
            } else {
              data = state.abandonedEmails;
            }
          }

          return { data, error };
        },
      };
      return builder;
    },
    auth: {
      admin: {
        listUsers: async () => ({
          data: {
            users: state.users.map((u) => ({ id: u.id, email: u.email })),
          },
          error: null,
        }),
      },
    },
  }),
}));

vi.mock('@/lib/email/client', () => ({
  getResendClient: () => ({
    emails: {
      send: async (params: any) => {
        state._lastSendParams = params;
        return state.sendResult;
      },
    },
  }),
  FROM_SUPPORT: 'Loving Charmz <hello@lovingcharmz.com>',
}));

vi.mock('next/headers', () => ({
  headers: async () => ({
    get: () => null,
  }),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// ---- Tests ----

describe('abandoned cart detection', () => {
  beforeEach(() => {
    state.carts = [];
    state.orders = [];
    state.abandonedEmails = [];
    state.users = [];
    state.sendResult = { error: null };
  });

  it('returns empty when no carts have items', async () => {
    state.carts = [{ id: 'c1', user_id: 'u1', updated_at: new Date().toISOString(), cart_items: [] }];
    state.users = [{ id: 'u1', email: 'test@example.com' }];

    const { findAbandonedCarts } = await import('@/lib/email/abandoned-cart');
    const result = await findAbandonedCarts();
    expect(result).toHaveLength(0);
  });

  it('returns empty when user placed a recent order', async () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    state.carts = [{
      id: 'c1',
      user_id: 'u1',
      updated_at: twoHoursAgo,
      cart_items: [{ product: { name: 'Charm', base_price: 50 }, variant: null, quantity: 1 }],
    }];
    state.orders = [{ user_id: 'u1', created_at: new Date().toISOString() }];
    state.users = [{ id: 'u1', email: 'test@example.com' }];

    const { findAbandonedCarts } = await import('@/lib/email/abandoned-cart');
    const result = await findAbandonedCarts();
    expect(result).toHaveLength(0);
  });

  it('detects abandoned cart with items and no recent order', async () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    state.carts = [{
      id: 'c1',
      user_id: 'u1',
      updated_at: twoHoursAgo,
      cart_items: [{
        product: { name: 'Companion Charm', base_price: 50 },
        variant: { name: 'Brass · Medium', price_adjustment: 0 },
        quantity: 1,
      }],
    }];
    state.orders = [];
    state.users = [{ id: 'u1', email: 'shopper@example.com' }];

    const { findAbandonedCarts } = await import('@/lib/email/abandoned-cart');
    const result = await findAbandonedCarts();
    expect(result).toHaveLength(1);
    expect(result[0].email).toBe('shopper@example.com');
    expect(result[0].cart_id).toBe('c1');
    expect(result[0].items).toHaveLength(1);
    expect(result[0].items[0].product_name).toBe('Companion Charm');
    expect(result[0].cart_total).toBe(50);
  });

  it('skips carts that already received an email in the last 24h', async () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    state.carts = [{
      id: 'c1',
      user_id: 'u1',
      updated_at: twoHoursAgo,
      cart_items: [{ product: { name: 'Charm', base_price: 50 }, variant: null, quantity: 1 }],
    }];
    state.abandonedEmails = [{ cart_id: 'c1', sent_at: new Date().toISOString() }];
    state.users = [{ id: 'u1', email: 'test@example.com' }];

    const { findAbandonedCarts } = await import('@/lib/email/abandoned-cart');
    const result = await findAbandonedCarts();
    expect(result).toHaveLength(0);
  });

  it('excludes unsubscribed users', async () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    state.carts = [{
      id: 'c1',
      user_id: 'u1',
      updated_at: twoHoursAgo,
      cart_items: [{ product: { name: 'Charm', base_price: 50 }, variant: null, quantity: 1 }],
    }];
    state.abandonedEmails = [{
      cart_id: 'c1',
      email: 'unsub@example.com',
      unsubscribed_at: new Date().toISOString(),
    }];
    state.users = [{ id: 'u1', email: 'unsub@example.com' }];

    const { findAbandonedCarts } = await import('@/lib/email/abandoned-cart');
    const result = await findAbandonedCarts();
    expect(result).toHaveLength(0);
  });

  it('computes cart total from variant price adjustments', async () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    state.carts = [{
      id: 'c1',
      user_id: 'u1',
      updated_at: twoHoursAgo,
      cart_items: [
        {
          product: { name: 'Companion Charm', base_price: 50 },
          variant: { name: 'Stainless Steel · Large', price_adjustment: 25 },
          quantity: 1,
        },
        {
          product: { name: 'Faithful Friend', base_price: 45 },
          variant: { name: 'Brass · Small', price_adjustment: 0 },
          quantity: 2,
        },
      ],
    }];
    state.users = [{ id: 'u1', email: 'test@example.com' }];

    const { findAbandonedCarts } = await import('@/lib/email/abandoned-cart');
    const result = await findAbandonedCarts();
    expect(result).toHaveLength(1);
    // 75 (Companion SS-L) + 90 (Faithful x2) = 165
    expect(result[0].cart_total).toBe(165);
  });
});

describe('sendAbandonedCartEmails', () => {
  beforeEach(() => {
    state.carts = [];
    state.orders = [];
    state.abandonedEmails = [];
    state.users = [];
    state.sendResult = { error: null };
  });

  it('sends email and records it', async () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    state.carts = [{
      id: 'c1',
      user_id: 'u1',
      updated_at: twoHoursAgo,
      cart_items: [{ product: { name: 'Charm', base_price: 50 }, variant: null, quantity: 1 }],
    }];
    state.users = [{ id: 'u1', email: 'shopper@example.com' }];

    const { sendAbandonedCartEmails } = await import('@/lib/email/abandoned-cart');
    const result = await sendAbandonedCartEmails();

    expect(result.found).toBe(1);
    expect(result.sent).toBe(1);
    expect(result.errors).toHaveLength(0);
    expect(state.abandonedEmails).toHaveLength(1);
    expect(state.abandonedEmails[0].email).toBe('shopper@example.com');
  });

  it('reports errors from Resend', async () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    state.carts = [{
      id: 'c1',
      user_id: 'u1',
      updated_at: twoHoursAgo,
      cart_items: [{ product: { name: 'Charm', base_price: 50 }, variant: null, quantity: 1 }],
    }];
    state.users = [{ id: 'u1', email: 'bad@example.com' }];
    state.sendResult = { error: { message: 'Invalid email' } };

    const { sendAbandonedCartEmails } = await import('@/lib/email/abandoned-cart');
    const result = await sendAbandonedCartEmails();

    expect(result.sent).toBe(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('Invalid email');
  });
});
