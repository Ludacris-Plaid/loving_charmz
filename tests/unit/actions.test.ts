import { describe, expect, it, vi } from 'vitest';

const getUser = vi.fn();
const insert = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    auth: { getUser: () => ({ data: { user: null } }) },
  }),
}));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

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
  it('returns an error when not authenticated', async () => {
    const { addToCartAction } = await import('@/lib/cart/actions');
    const res = await addToCartAction('prod-1', null, 1);
    expect(res.error).toMatch(/sign in/i);
  });
});
