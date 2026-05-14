import { Card } from '@/components/ui/Card';

export default function AdminPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-brand-800">Admin Dashboard</h2>
        <p className="mt-1 text-sm text-brand-600">
          Manage products, orders, customers, content, and view analytics.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card padding="md" className="text-center">
          <p className="text-2xl font-bold text-brand-700">0</p>
          <p className="mt-1 text-xs text-brand-600">Total Orders</p>
        </Card>
        <Card padding="md" className="text-center">
          <p className="text-2xl font-bold text-brand-700">$0</p>
          <p className="mt-1 text-xs text-brand-600">Revenue</p>
        </Card>
        <Card padding="md" className="text-center">
          <p className="text-2xl font-bold text-brand-700">0</p>
          <p className="mt-1 text-xs text-brand-600">Customers</p>
        </Card>
      </div>

      <Card padding="md">
        <h3 className="font-medium text-brand-800">Recent Orders</h3>
        <p className="mt-2 text-sm text-brand-600">No orders yet.</p>
      </Card>
    </div>
  );
}