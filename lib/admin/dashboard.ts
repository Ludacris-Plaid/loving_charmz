import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

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
    recentRes,
  ] = await Promise.all([
    admin.from('products').select('id', { count: 'exact', head: true }).eq('is_active', true),
    admin.from('orders').select('id, total, status, created_at'),
    admin.from('profiles').select('id', { count: 'exact', head: true }),
    admin.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    admin.from('personalization_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    admin.from('product_variants').select('id', { count: 'exact', head: true }).lt('stock_quantity', 5).eq('is_active', true),
    admin
      .from('orders')
      .select('id, created_at, status, total, user_id')
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  const orders = ordersRes.data || [];
  const revenue = orders.reduce((sum, o) => sum + Number(o.total || 0), 0);

  return {
    products: productsRes.count ?? 0,
    orders: orders.length,
    customers: profilesRes.count ?? 0,
    revenue,
    pendingOrders: pendingRes.count ?? 0,
    pendingPersonalizations: personalizationsRes.count ?? 0,
    lowStockVariants: lowStockRes.count ?? 0,
    recentOrders: (recentRes.data || []) as DashboardStats['recentOrders'],
  };
}
