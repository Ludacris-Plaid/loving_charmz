import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    auth: { getUser: () => ({ data: { user: null } }) },
  }),
}));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: () => ({ value: undefined }),
    set: vi.fn(),
  }),
}));

vi.mock('@/lib/cart/guest', () => ({
  ensureGuestCartToken: async () => 'guest-token-test',
  readGuestCartToken: async () => 'guest-token-test',
  findGuestCartByToken: async () => ({ id: 'guest-cart' }),
  getOrCreateGuestCart: async () => ({ id: 'guest-cart' }),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => {
      const chain: any = {
        select: () => chain,
        insert: () => chain,
        update: () => chain,
        delete: () => chain,
        eq: () => chain,
        is: () => chain,
        maybeSingle: async () => ({ data: null, error: null }),
        single: async () => ({ data: { id: 'cart-item-1', quantity: 1 }, error: null }),
      };
      return chain;
    },
  }),
}));

describe('createPersonalizationRequestAction', () => {
  it('returns an error when not authenticated', async () => {
    const { createPersonalizationRequestAction } = await import('@/lib/personalization/actions');
    const fd = new FormData();
    fd.set('pet_name', 'Luna');
    fd.set('freeform_text', 'A small keepsake.');
    const res = await createPersonalizationRequestAction(fd);
    expect(res.error).toMatch(/sign in/i);
  });
});

describe('getCartCount', () => {
  it('returns 0 when no user is signed in', async () => {
    const { getCartCount } = await import('@/lib/cart/server');
    const count = await getCartCount();
    expect(count).toBe(0);
  });
});

describe('updateEmailPreferencesAction', () => {
  it('returns an error when not authenticated', async () => {
    const { updateEmailPreferencesAction } = await import('@/lib/wishlist/actions');
    const fd = new FormData();
    fd.set('order_updates', 'on');
    const res = await updateEmailPreferencesAction(fd);
    expect(res.error).toBe('Not authenticated');
  });
});

describe('addToCartAction', () => {
  it('adds an item to the guest cart when not authenticated', async () => {
    const { addToCartAction } = await import('@/lib/cart/actions');
    const res = await addToCartAction('prod-1', null, 1);
    expect(res.success).toBe(true);
  });
});
