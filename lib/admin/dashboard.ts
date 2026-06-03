import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

export type ActionItem = {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  href: string;
  count?: number;
};

export type DashboardStats = {
  products: number;
  orders: number;
  customers: number;
  revenue: number;
  pendingOrders: number;
  pendingPersonalizations: number;
  lowStockVariants: number;
  recentOrders: Array<{
    id: string;
    created_at: string;
    status: string;
    total: number;
    user_id: string | null;
  }>;
  actionItems: ActionItem[];
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const admin = createAdminClient();
  const [
    productsRes,
    ordersRes,
    profilesRes,
    pendingRes,
    personalizationsRes,
    lowStockRes,
    outOfStockRes,
    discountsRes,
    recentRes,
  ] = await Promise.all([
    admin.from('products').select('id', { count: 'exact', head: true }).eq('is_active', true),
    admin.from('orders').select('id, total, status, created_at'),
    admin.from('profiles').select('id', { count: 'exact', head: true }),
    admin.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    admin.from('personalization_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    admin.from('product_variants').select('id', { count: 'exact', head: true }).lt('stock_quantity', 5).eq('is_active', true),
    admin.from('product_variants').select('id', { count: 'exact', head: true }).eq('stock_quantity', 0).eq('is_active', true),
    admin.from('discounts').select('id, is_active, expires_at').gte('expires_at', new Date().toISOString()),
    admin
      .from('orders')
      .select('id, created_at, status, total, user_id')
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  const orders = ordersRes.data || [];
  const revenue = orders.reduce((sum, o) => sum + Number(o.total || 0), 0);

  const lowStockCount = lowStockRes.count ?? 0;
  const outOfStockCount = outOfStockRes.count ?? 0;
  const pendingOrdersCount = pendingRes.count ?? 0;
  const pendingPersonalizationsCount = personalizationsRes.count ?? 0;

  const actionItems: ActionItem[] = [];

  if (lowStockCount > 0) {
    actionItems.push({
      id: 'low-stock',
      severity: lowStockCount > 3 ? 'critical' : 'warning',
      title: `${lowStockCount} variant${lowStockCount === 1 ? '' : 's'} low on stock`,
      description: 'Reorder or disable variants running low to avoid overselling.',
      href: '/admin/inventory',
      count: lowStockCount,
    });
  }

  if (outOfStockCount > 0) {
    actionItems.push({
      id: 'out-of-stock',
      severity: 'critical',
      title: `${outOfStockCount} variant${outOfStockCount === 1 ? '' : 's'} out of stock`,
      description: 'Hidden from the storefront — restock or mark inactive.',
      href: '/admin/inventory',
      count: outOfStockCount,
    });
  }

  if (pendingOrdersCount > 0) {
    actionItems.push({
      id: 'pending-orders',
      severity: 'warning',
      title: `${pendingOrdersCount} order${pendingOrdersCount === 1 ? '' : 's'} awaiting fulfillment`,
      description: 'Move orders through processing, shipping, and delivery.',
      href: '/admin/orders',
      count: pendingOrdersCount,
    });
  }

  if (pendingPersonalizationsCount > 0) {
    actionItems.push({
      id: 'pending-personalization',
      severity: 'info',
      title: `${pendingPersonalizationsCount} custom request${pendingPersonalizationsCount === 1 ? '' : 's'} in queue`,
      description: 'Review and respond to personalization requests.',
      href: '/admin/personalization',
      count: pendingPersonalizationsCount,
    });
  }

  const expiringDiscounts = (discountsRes.data || []).filter((d: any) => {
    if (!d.expires_at || !d.is_active) return false;
    const days = (new Date(d.expires_at).getTime() - Date.now()) / 86400000;
    return days > 0 && days <= 14;
  });
  if (expiringDiscounts.length > 0) {
    actionItems.push({
      id: 'discounts-expiring',
      severity: 'info',
      title: `${expiringDiscounts.length} discount${expiringDiscounts.length === 1 ? '' : 's'} expiring within 14 days`,
      description: 'Renew or replace soon-to-expire promotional codes.',
      href: '/admin/discounts',
      count: expiringDiscounts.length,
    });
  }

  return {
    products: productsRes.count ?? 0,
    orders: orders.length,
    customers: profilesRes.count ?? 0,
    revenue,
    pendingOrders: pendingOrdersCount,
    pendingPersonalizations: pendingPersonalizationsCount,
    lowStockVariants: lowStockCount,
    recentOrders: (recentRes.data || []) as DashboardStats['recentOrders'],
    actionItems,
  };
}
