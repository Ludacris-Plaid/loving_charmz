import { getAdminCustomers } from '@/lib/admin/data';

export const metadata = {
  title: 'Admin · Customers — Loving Charmz',
};

export const dynamic = 'force-dynamic';

export default async function AdminCustomersPage() {
  const customers = await getAdminCustomers();

  return (
    <div className="space-y-6">
      <div>
        <span className="badge-plum">People</span>
        <h1 className="font-display text-3xl font-semibold text-plum-900 mt-3">Customers</h1>
        <p className="text-sm text-ink-600 mt-1">
          {customers.length} customer{customers.length === 1 ? '' : 's'} total.
        </p>
      </div>

      {customers.length === 0 ? (
        <div className="text-center py-12 surface-card text-sm text-ink-500">
          No customers yet.
        </div>
      ) : (
        <div className="surface-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-cream-100 text-left text-xs uppercase tracking-wider text-ink-500">
                <th className="px-4 py-3">Username</th>
                <th className="px-4 py-3">Display name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Public</th>
                <th className="px-4 py-3">Orders</th>
                <th className="px-4 py-3">Joined</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-t border-cream-200 text-sm">
                  <td className="px-4 py-3 font-medium text-ink-800">@{c.username}</td>
                  <td className="px-4 py-3 text-ink-700">{c.display_name || '—'}</td>
                  <td className="px-4 py-3 text-ink-700">{c.email || '—'}</td>
                  <td className="px-4 py-3">
                    {c.is_public ? (
                      <span className="badge-mint">Public</span>
                    ) : (
                      <span className="badge-soft">Private</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink-700">{c.order_count}</td>
                  <td className="px-4 py-3 text-ink-500">
                    {new Date(c.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
