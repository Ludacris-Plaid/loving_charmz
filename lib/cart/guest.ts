import 'server-only';

import { randomUUID } from 'node:crypto';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Guest (anonymous) carts.
 *
 * A signed-out shopper gets a cart keyed to an httpOnly cookie token; the
 * `carts.cookie_token` column maps the token to a cart row with a NULL
 * user_id. All guest cart reads/writes go through the admin client because
 * RLS only grants members access to their own carts — the token in the
 * cookie is the guest's proof of ownership, and it is a random UUID that
 * cannot be guessed.
 *
 * On sign-in, `mergeGuestCartIntoMember` folds the guest cart into the
 * member's cart and deletes the guest rows (see lib/auth/actions.ts).
 */

export const GUEST_CART_COOKIE = 'lc_cart';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function readGuestCartToken(): Promise<string | null> {
  try {
    const jar = await cookies();
    return jar.get(GUEST_CART_COOKIE)?.value ?? null;
  } catch {
    return null;
  }
}

/**
 * Returns the existing token or mints a new one, setting the cookie.
 * Only callable from a Server Action or Route Handler (cookie writes are
 * read-only during page render — callers must handle that).
 */
export async function ensureGuestCartToken(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(GUEST_CART_COOKIE)?.value;
  if (existing) return existing;

  const token = randomUUID();
  jar.set(GUEST_CART_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });
  return token;
}

export async function findGuestCartByToken(token: string | null) {
  if (!token) return null;
  const admin = createAdminClient();
  const { data: cart } = await admin
    .from('carts')
    .select('*')
    .eq('cookie_token', token)
    .is('user_id', null)
    .maybeSingle();
  return cart ?? null;
}

/** Gets or creates the guest cart for a token. */
export async function getOrCreateGuestCart(token: string) {
  const admin = createAdminClient();
  const existing = await findGuestCartByToken(token);
  if (existing) return existing;

  const { data: created, error } = await admin
    .from('carts')
    .insert({ user_id: null, cookie_token: token })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return created;
}

export async function getGuestCartItems(cartId: string) {
  const admin = createAdminClient();
  const { data: items } = await admin
    .from('cart_items')
    .select(`
      *,
      product:products (*),
      variant:product_variants (*)
    `)
    .eq('cart_id', cartId);
  return items ?? [];
}

/**
 * Folds the guest cart into the member's cart after sign-in: matching
 * product+variant rows have their quantities combined, the rest are copied,
 * and the guest cart is deleted along with its cookie.
 */
export async function mergeGuestCartIntoMember(userId: string): Promise<void> {
  const token = await readGuestCartToken();
  if (!token) return;

  const guestCart = await findGuestCartByToken(token);
  if (!guestCart) return;

  const admin = createAdminClient();
  const { data: guestItems } = await admin
    .from('cart_items')
    .select('*')
    .eq('cart_id', guestCart.id);

  // Member cart (get-or-create).
  let memberCartId: string | null = null;
  const { data: existingMemberCart } = await admin
    .from('carts')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();
  if (existingMemberCart) {
    memberCartId = existingMemberCart.id;
  } else {
    const { data: created } = await admin
      .from('carts')
      .insert({ user_id: userId })
      .select('id')
      .single();
    memberCartId = created?.id ?? null;
  }

  if (memberCartId && guestItems && guestItems.length > 0) {
    const { data: memberItems } = await admin
      .from('cart_items')
      .select('*')
      .eq('cart_id', memberCartId);

    for (const item of guestItems) {
      const match = (memberItems || []).find(
        (m) => m.product_id === item.product_id && m.variant_id === item.variant_id,
      );
      if (match) {
        await admin
          .from('cart_items')
          .update({ quantity: Math.min(99, Number(match.quantity || 0) + Number(item.quantity || 0)) })
          .eq('id', match.id);
      } else {
        await admin.from('cart_items').insert({
          cart_id: memberCartId,
          product_id: item.product_id,
          variant_id: item.variant_id,
          quantity: item.quantity,
        });
      }
    }
  }

  // Guest cart is fully absorbed — remove it and the cookie.
  await admin.from('cart_items').delete().eq('cart_id', guestCart.id);
  await admin.from('carts').delete().eq('id', guestCart.id);
  try {
    const jar = await cookies();
    jar.delete(GUEST_CART_COOKIE);
  } catch {
    /* not in a writable cookie context — harmless */
  }
}
