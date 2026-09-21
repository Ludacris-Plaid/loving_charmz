import 'server-only';

import { createClient } from '@/lib/supabase/server';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidOrderId(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export type OwnedOrder = {
  id: string;
  user_id: string | null;
  payment_status: string;
  total: number;
  status: string;
};

export type OwnedOrderLookup =
  | { kind: 'unauthenticated' }
  | { kind: 'not_found' }
  | { kind: 'ok'; order: OwnedOrder };

/**
 * Loads an order through the *member's* client and checks ownership.
 *
 * Route handlers that finish a payment are reachable by URL, so they must not
 * trust the id in the path: RLS plus an explicit `user_id` comparison means a
 * signed-in shopper can only ever settle their own order. Guest orders
 * (user_id NULL, created through guest checkout) are settleable by the
 * unauthenticated caller that owns the checkout session — the order UUID is
 * the capability, and provider settlement always re-verifies the money with
 * the provider itself, so a guessed id settles nothing.
 */
export async function loadOwnedOrder(orderId: string): Promise<OwnedOrderLookup> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // The order row is read with the member client for members (RLS-enforced)
  // and with the admin client only to discover whether an order exists at
  // all for the guest branch below.
  if (user) {
    const { data: order, error } = await supabase
      .from('orders')
      .select('id, user_id, payment_status, total, status')
      .eq('id', orderId)
      .maybeSingle();

    if (error || !order || order.user_id !== user.id) return { kind: 'not_found' };
    return { kind: 'ok', order: order as OwnedOrder };
  }

  const { createAdminClient } = await import('@/lib/supabase/admin');
  const admin = createAdminClient();
  const { data: order } = await admin
    .from('orders')
    .select('id, user_id, payment_status, total, status')
    .eq('id', orderId)
    .maybeSingle();

  if (!order) return { kind: 'not_found' };
  // A member's order may never be settled by an anonymous request.
  if (order.user_id) return { kind: 'unauthenticated' };
  return { kind: 'ok', order: order as OwnedOrder };
}
