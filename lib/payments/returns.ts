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
 * signed-in shopper can only ever settle their own order.
 */
export async function loadOwnedOrder(orderId: string): Promise<OwnedOrderLookup> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { kind: 'unauthenticated' };

  const { data: order, error } = await supabase
    .from('orders')
    .select('id, user_id, payment_status, total, status')
    .eq('id', orderId)
    .maybeSingle();

  if (error || !order || order.user_id !== user.id) return { kind: 'not_found' };
  return { kind: 'ok', order: order as OwnedOrder };
}
