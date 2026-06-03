'use client';

import { useState, useTransition } from 'react';
import { Input } from '@/components/ui/Input';
import { upsertDiscountAction, deleteDiscountAction } from '@/lib/admin/actions';

type Discount = {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_amount: number;
  max_uses: number | null;
  current_uses: number;
  is_active: boolean;
  starts_at: string | null;
  expires_at: string | null;
};

type Props = {
  discounts: Discount[];
};

export function AdminDiscountsClient({ discounts }: Props) {
  const [editing, setEditing] = useState<Discount | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = (formData: FormData) => {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const res = await upsertDiscountAction(formData);
      if (res.error) setError(res.error);
      else {
        setSuccess('Discount saved.');
        setEditing(null);
        setShowNew(false);
        setTimeout(() => setSuccess(null), 2500);
      }
    });
  };

  const handleDelete = (code: string) => {
    if (!confirm(`Delete discount ${code}?`)) return;
    startTransition(async () => {
      const res = await deleteDiscountAction(code);
      if (res.error) setError(res.error);
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button onClick={() => { setShowNew(true); setEditing(null); }} className="btn-plum px-5 py-2 text-xs">
          New discount
        </button>
      </div>

      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
      {success && <p className="text-sm text-plum-700" role="status">{success}</p>}

      {(showNew || editing) && (
        <DiscountForm
          initial={editing}
          pending={pending}
          onCancel={() => { setShowNew(false); setEditing(null); }}
          onSubmit={handleSubmit}
        />
      )}

      {discounts.length === 0 ? (
        <div className="text-center py-12 surface-card text-sm text-ink-500">
          No discount codes yet.
        </div>
      ) : (
        <div className="surface-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-cream-100 text-left text-xs uppercase tracking-wider text-ink-500">
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Value</th>
                <th className="px-4 py-3">Uses</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {discounts.map((d) => (
                <tr key={d.id} className="border-t border-cream-200 text-sm">
                  <td className="px-4 py-3 font-mono text-plum-700">{d.code}</td>
                  <td className="px-4 py-3 text-ink-700 capitalize">{d.discount_type}</td>
                  <td className="px-4 py-3 text-ink-800">
                    {d.discount_type === 'percentage' ? `${d.discount_value}%` : `$${d.discount_value}`}
                  </td>
                  <td className="px-4 py-3 text-ink-700">
                    {d.current_uses}
                    {d.max_uses ? ` / ${d.max_uses}` : ' / ∞'}
                  </td>
                  <td className="px-4 py-3">
                    {d.is_active ? <span className="badge-mint">Active</span> : <span className="badge-soft">Inactive</span>}
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      onClick={() => { setEditing(d); setShowNew(false); }}
                      className="text-xs font-medium uppercase tracking-wider text-plum-700 hover:text-plum-900 motion-base"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(d.code)}
                      className="text-xs font-medium uppercase tracking-wider text-red-600 hover:text-red-700 motion-base"
                    >
                      Delete
                    </button>
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

type FormProps = {
  initial: Discount | null;
  pending: boolean;
  onCancel: () => void;
  onSubmit: (formData: FormData) => void;
};

function DiscountForm({ initial, pending, onCancel, onSubmit }: FormProps) {
  return (
    <form action={onSubmit} className="surface-card p-6 space-y-4">
      <h2 className="font-display text-lg font-semibold text-plum-900">
        {initial ? 'Edit discount' : 'New discount'}
      </h2>
      <div className="grid sm:grid-cols-2 gap-4">
        <Input label="Code" name="code" required defaultValue={initial?.code} hint="Customers type this at checkout." />
        <div>
          <label htmlFor="discount_type" className="block text-sm font-medium text-ink-700 mb-1.5">Type</label>
          <select
            id="discount_type"
            name="discount_type"
            defaultValue={initial?.discount_type || 'percentage'}
            className="input-base"
          >
            <option value="percentage">Percentage</option>
            <option value="fixed">Fixed amount</option>
          </select>
        </div>
        <Input label="Value" name="discount_value" type="number" step="0.01" min="0.01" required defaultValue={initial?.discount_value} />
        <Input label="Minimum order" name="min_order_amount" type="number" step="0.01" min="0" defaultValue={initial?.min_order_amount ?? 0} />
        <Input label="Max uses (blank = unlimited)" name="max_uses" type="number" min="0" defaultValue={initial?.max_uses ?? ''} />
        <label className="flex items-center gap-2 text-sm text-ink-700 self-end pb-2">
          <input
            type="checkbox"
            name="is_active"
            defaultChecked={initial ? initial.is_active : true}
            className="h-4 w-4 accent-plum-700"
          />
          Active
        </label>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="btn-ghost px-4 py-2 text-xs">Cancel</button>
        <button type="submit" disabled={pending} className="btn-plum px-5 py-2 text-xs">
          {pending ? 'Saving…' : initial ? 'Save changes' : 'Create discount'}
        </button>
      </div>
    </form>
  );
}
