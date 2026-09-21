import { describe, expect, it, vi, beforeEach } from 'vitest';

/**
 * Tests for flushStockAlerts — the owner digest for sold-out variants.
 * The trigger queueing rows is covered by supabase/tests/stock_alerts.test.sql;
 * here we verify the app-side read → send → drain pipeline.
 */

const state = vi.hoisted(() => ({
  alerts: [] as any[],
  sendResult: { error: null as any },
  lastSend: null as any,
  deletedIds: null as string[] | null,
  deleteError: null as any,
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => ({
      select: () => ({
        order: async () => ({ data: state.alerts, error: null }),
      }),
      delete: () => ({
        in: async (_col: string, ids: string[]) => {
          state.deletedIds = ids;
          return { error: state.deleteError };
        },
      }),
    }),
  }),
}));

vi.mock('@/lib/email/client', () => ({
  getResendClient: () => ({
    emails: {
      send: async (params: any) => {
        state.lastSend = params;
        return state.sendResult;
      },
    },
  }),
  FROM_SUPPORT: 'Loving Charmz <hello@lovingcharmz.com>',
}));

vi.mock('next/headers', () => ({
  headers: async () => ({ get: () => null }),
}));

beforeEach(() => {
  state.alerts = [];
  state.sendResult = { error: null };
  state.lastSend = null;
  state.deletedIds = null;
  state.deleteError = null;
});

describe('flushStockAlerts', () => {
  it('flushes nothing when the queue is empty', async () => {
    const { flushStockAlerts } = await import('@/lib/email/stock-alerts');
    const result = await flushStockAlerts();
    expect(result.flushed).toBe(0);
    expect(state.lastSend).toBeNull();
  });

  it('emails one digest listing all alerts and drains the queue', async () => {
    state.alerts = [
      { id: 'a1', variant_id: 'v1', product_name: 'Companion Charm', variant_name: 'Brass · Small', created_at: new Date().toISOString() },
      { id: 'a2', variant_id: 'v2', product_name: 'Faithful Friend', variant_name: 'Stainless · Large', created_at: new Date().toISOString() },
    ];

    const { flushStockAlerts } = await import('@/lib/email/stock-alerts');
    const result = await flushStockAlerts();

    expect(result.flushed).toBe(2);
    expect(state.lastSend.to).toBe('hello@lovingcharmz.com');
    expect(state.lastSend.subject).toContain('2 charms sold out');
    expect(state.lastSend.html).toContain('Companion Charm');
    expect(state.lastSend.html).toContain('Faithful Friend');
    // Queue drained by id
    expect(state.deletedIds).toEqual(['a1', 'a2']);
  });

  it('uses a single-item subject for one alert', async () => {
    state.alerts = [
      { id: 'a1', variant_id: 'v1', product_name: 'Companion Charm', variant_name: 'Brass · Small', created_at: new Date().toISOString() },
    ];

    const { flushStockAlerts } = await import('@/lib/email/stock-alerts');
    const result = await flushStockAlerts();

    expect(result.flushed).toBe(1);
    expect(state.lastSend.subject).toBe('Sold out: Companion Charm (Brass · Small) — Loving Charmz');
  });

  it('leaves the queue intact when Resend rejects the send', async () => {
    state.alerts = [
      { id: 'a1', variant_id: 'v1', product_name: 'Companion Charm', variant_name: 'Brass · Small', created_at: new Date().toISOString() },
    ];
    state.sendResult = { error: { message: 'bounce' } };

    const { flushStockAlerts } = await import('@/lib/email/stock-alerts');
    const result = await flushStockAlerts();

    expect(result.flushed).toBe(0);
    expect(state.deletedIds).toBeNull();
  });

  it('leaves the queue intact when the drain fails (alerts re-email next run)', async () => {
    state.alerts = [
      { id: 'a1', variant_id: 'v1', product_name: 'Companion Charm', variant_name: 'Brass · Small', created_at: new Date().toISOString() },
    ];
    state.deleteError = { message: 'db write failed' };

    const { flushStockAlerts } = await import('@/lib/email/stock-alerts');
    const result = await flushStockAlerts();

    // Email was sent (flushed=1) but the queue row survives for re-delivery.
    expect(result.flushed).toBe(1);
    expect(state.deletedIds).toEqual(['a1']);
  });
});
