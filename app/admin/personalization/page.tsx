import { getPersonalizations } from '@/lib/admin/data';
import { AdminPersonalizationClient } from '@/components/admin/AdminPersonalizationClient';

export const metadata = {
  title: 'Admin · Personalization — Loving Charmz',
};

export const dynamic = 'force-dynamic';

const statusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'reviewing', label: 'Reviewing' },
  { value: 'quoted', label: 'Quoted' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default async function AdminPersonalizationPage() {
  const rows = await getPersonalizations();
  return (
    <div className="space-y-6">
      <div>
        <span className="badge-plum">Custom</span>
        <h1 className="font-display text-3xl font-semibold text-plum-900 mt-3">Personalization requests</h1>
        <p className="text-sm text-ink-600 mt-1">Triage, quote, and progress custom orders.</p>
      </div>
      <AdminPersonalizationClient
        rows={rows.map((r: any) => ({
          id: r.id,
          status: r.status,
          pet_name: r.pet_name,
          freeform_text: r.freeform_text,
          reference_image_url: r.reference_image_url,
          charm_selections: r.charm_selections,
          admin_notes: r.admin_notes,
          created_at: r.created_at,
          product_name: r.products?.name || null,
          product_slug: r.products?.slug || null,
        }))}
        statusOptions={statusOptions}
      />
    </div>
  );
}
