import { describe, expect, it, vi } from 'vitest';

const fromMock = vi.fn();
const getUser = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    auth: { getUser: () => ({ data: { user: null } }) },
  }),
}));

vi.mock('@/components/admin/AdminGuard', () => ({
  getSession: async () => null,
}));

describe('admin product action', () => {
  it('rejects createProductAction when not admin', async () => {
    const { createProductAction } = await import('@/lib/admin/actions');
    const fd = new FormData();
    fd.set('name', 'Loyal Companion Pendant');
    fd.set('base_price', '85');
    const res = await createProductAction(fd);
    expect(res.error).toMatch(/admin/i);
  });
});

describe('admin order action', () => {
  it('rejects updateOrderStatusAction when not admin', async () => {
    const { updateOrderStatusAction } = await import('@/lib/admin/actions');
    const res = await updateOrderStatusAction('order-1', 'shipped');
    expect(res.error).toMatch(/admin/i);
  });
});

describe('admin discount action', () => {
  it('rejects upsertDiscountAction when not admin', async () => {
    const { upsertDiscountAction } = await import('@/lib/admin/actions');
    const fd = new FormData();
    fd.set('code', 'WELCOME');
    fd.set('discount_type', 'percentage');
    fd.set('discount_value', '10');
    const res = await upsertDiscountAction(fd);
    expect(res.error).toMatch(/admin/i);
  });
});
