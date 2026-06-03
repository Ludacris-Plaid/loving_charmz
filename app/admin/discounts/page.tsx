import { getDiscounts } from '@/lib/admin/data';
import { AdminDiscountsClient } from '@/components/admin/AdminDiscountsClient';

export const metadata = {
  title: 'Admin · Discounts — Loving Charmz',
};

export const dynamic = 'force-dynamic';

export default async function AdminDiscountsPage() {
  const discounts = await getDiscounts();
  return (
    <div className="space-y-6">
      <div>
        <span className="badge-plum">Promotions</span>
        <h1 className="font-display text-3xl font-semibold text-plum-900 mt-3">Discount codes</h1>
        <p className="text-sm text-ink-600 mt-1">Create and manage promotional codes for your store.</p>
      </div>
      <AdminDiscountsClient
        discounts={discounts.map((d: any) => ({
          id: d.id,
          code: d.code,
          discount_type: d.discount_type,
          discount_value: Number(d.discount_value),
          min_order_amount: Number(d.min_order_amount || 0),
          max_uses: d.max_uses,
          current_uses: Number(d.current_uses || 0),
          is_active: Boolean(d.is_active),
          starts_at: d.starts_at,
          expires_at: d.expires_at,
        }))}
      />
    </div>
  );
}
