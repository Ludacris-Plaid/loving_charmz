import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Order, OrderItem } from '@/lib/supabase/types';

export type AdminOrder = Order & { items?: OrderItem[]; customer_email?: string | null };

export async function getAdminOrders(): Promise<AdminOrder[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('orders')
    .select('*, order_items(*), user_id')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);

  const userIds = Array.from(new Set((data || []).map((o: any) => o.user_id).filter(Boolean)));
  let emailById: Record<string, string> = {};
  if (userIds.length) {
    const { data: users } = await admin.auth.admin.listUsers();
    if (users?.users) {
      for (const u of users.users) {
        if (userIds.includes(u.id)) emailById[u.id] = u.email || '';
      }
    }
  }
  return (data || []).map((o: any) => ({
    ...o,
    items: o.order_items || [],
    customer_email: o.user_id ? emailById[o.user_id] ?? null : null,
  }));
}

export type AdminCustomer = {
  id: string;
  username: string;
  display_name: string | null;
  is_public: boolean;
  created_at: string;
  email: string | null;
  order_count: number;
  last_sign_in_at: string | null;
  is_subscriber: boolean;
  custom_order_count: number;
  admin_notes: string | null;
};

export async function getAdminCustomers(): Promise<AdminCustomer[]> {
  const admin = createAdminClient();
  const [
    { data: profiles, error: profilesErr },
    { data: users },
    { data: customOrders },
    { data: subscribers },
    { data: adminNotes },
  ] = await Promise.all([
    admin.from('profiles').select('*').order('created_at', { ascending: false }),
    admin.auth.admin.listUsers(),
    admin.from('personalization_requests').select('user_id'),
    admin.from('subscribers').select('email'),
    admin.from('customer_admin_notes').select('user_id, notes'),
  ]);
  if (profilesErr) throw new Error(profilesErr.message);

  const profileIds = (profiles || []).map((p) => p.id);
  const counts: Record<string, number> = {};
  if (profileIds.length) {
    const { data: orders } = await admin
      .from('orders')
      .select('user_id')
      .in('user_id', profileIds);
    for (const o of orders || []) {
      if (o.user_id) counts[o.user_id] = (counts[o.user_id] || 0) + 1;
    }
  }

  // Custom-order requests per customer.
  const customCounts: Record<string, number> = {};
  for (const r of customOrders || []) {
    if (r.user_id) customCounts[r.user_id] = (customCounts[r.user_id] || 0) + 1;
  }

  // Mailing-list membership by email (case-insensitive).
  const subscriberEmails = new Set(
    (subscribers || []).map((s) => (s.email || '').toLowerCase())
  );

  // Private admin notes (customer_admin_notes, 00019).
  const notesByUser = new Map(
    (adminNotes || []).map((n) => [n.user_id, n.notes as string])
  );

  return (profiles || []).map((p: any) => ({
    id: p.id,
    username: p.username,
    display_name: p.display_name,
    is_public: p.is_public,
    created_at: p.created_at,
    email: users?.users?.find((u) => u.id === p.id)?.email || null,
    order_count: counts[p.id] || 0,
    last_sign_in_at: users?.users?.find((u) => u.id === p.id)?.last_sign_in_at || null,
    is_subscriber: Boolean(p.email && subscriberEmails.has(p.email.toLowerCase())),
    custom_order_count: customCounts[p.id] || 0,
    admin_notes: notesByUser.get(p.id) || null,
  }));
}

export async function getAdminCollections() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('collections')
    .select('*, collection_products(count)')
    .order('sort_order', { ascending: true });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function getInventoryRows() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('product_variants')
    .select(
      'id, name, sku, stock_quantity, price_adjustment, is_active, material, size, product_id, products(name, slug, kind)',
    )
    .order('stock_quantity', { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []).map((row: any) => ({
    id: row.id,
    name: row.name,
    sku: row.sku,
    stock_quantity: row.stock_quantity,
    price_adjustment: row.price_adjustment ?? 0,
    is_active: row.is_active,
    material: row.material ?? null,
    size: row.size ?? null,
    product_id: row.product_id,
    product_name: row.products?.name || '—',
    product_slug: row.products?.slug || '',
    product_kind: row.products?.kind || 'jewelry',
  }));
}

export async function getPersonalizations() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('personalization_requests')
    .select('*, products(name, slug, base_price)')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function getContentBlocks() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('content_blocks')
    .select('*')
    .order('slug', { ascending: true });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function getDiscounts() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('discounts')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}
