'use client';

import { useState, useTransition } from 'react';
import { Input } from '@/components/ui/Input';
import {
  upsertVariantAction,
  deleteVariantAction,
} from '@/lib/admin/collections-and-variants';
import { updateVariantStockAction } from '@/lib/admin/actions';

type Row = {
  id: string;
  name: string;
  sku: string | null;
  stock_quantity: number;
  is_active: boolean;
  product_name: string;
  product_slug: string;
};

type Props = {
  rows: Row[];
  products: Array<{ id: string; name: string }>;
};

export function AdminInventoryClient({ rows, products }: Props) {
  const [editing, setEditing] = useState<Row | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busyStock, setBusyStock] = useState<string | null>(null);

  const handleStock = (id: string, raw: string) => {
    const next = Number(raw);
    if (!Number.isFinite(next) || next < 0) return;
    setBusyStock(id);
    setError(null);
    startTransition(async () => {
      const res = await updateVariantStockAction(id, next);
      if (res.error) setError(res.error);
      setBusyStock(null);
    });
  };

  const handleSubmit = (formData: FormData) => {
    setError(null);
    setSuccess(null);
    const productId = (formData.get('product_id') as string) || (editing && rows.find(r => r.id === editing.id)?.product_slug) || '';
    startTransition(async () => {
      const res = editing
        ? await upsertVariantAction(productId, formData)
        : await upsertVariantAction(adding || '', formData);
      if (res.error) setError(res.error);
      else {
        setSuccess(editing ? 'Variant updated.' : 'Variant added.');
        setEditing(null);
        setAdding(null);
        setTimeout(() => setSuccess(null), 2500);
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete this variant?')) return;
    startTransition(async () => {
      const res = await deleteVariantAction(id);
      if (res.error) setError(res.error);
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        {products.length > 0 && (
          <select
            onChange={(e) => { if (e.target.value) setAdding(e.target.value); }}
            className="input-base max-w-xs"
            defaultValue=""
          >
            <option value="" disabled>Add variant to product…</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}
      </div>

      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
      {success && <p className="text-sm text-plum-700" role="status">{success}</p>}

      {(editing || adding) && (
        <VariantForm
          initial={editing}
          pending={pending}
          onCancel={() => { setEditing(null); setAdding(null); }}
          onSubmit={handleSubmit}
        />
      )}

      {rows.length === 0 ? (
        <div className="text-center py-12 surface-card text-sm text-ink-500">
          No variants yet. Create products first, then add variants here.
        </div>
      ) : (
        <div className="surface-card overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-cream-100 text-left text-xs uppercase tracking-wider text-ink-500">
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Variant</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Active</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-cream-200 text-sm">
                  <td className="px-4 py-3 font-medium text-ink-800">{r.product_name}</td>
                  <td className="px-4 py-3 text-ink-700">{r.name}</td>
                  <td className="px-4 py-3 text-xs font-mono text-ink-500">{r.sku || '—'}</td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min="0"
                      defaultValue={r.stock_quantity}
                      onBlur={(e) => {
                        if (Number(e.target.value) !== r.stock_quantity) {
                          handleStock(r.id, e.target.value);
                        }
                      }}
                      disabled={busyStock === r.id}
                      className="input-base w-24 py-1.5 text-sm"
                    />
                  </td>
                  <td className="px-4 py-3">
                    {r.is_active ? <span className="badge-mint">Yes</span> : <span className="badge-soft">No</span>}
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      onClick={() => { setEditing(r); setAdding(null); }}
                      className="text-xs font-medium uppercase tracking-wider text-plum-700 hover:text-plum-900 motion-base"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(r.id)}
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
  initial: Row | null;
  pending: boolean;
  onCancel: () => void;
  onSubmit: (formData: FormData) => void;
};

function VariantForm({ initial, pending, onCancel, onSubmit }: FormProps) {
  return (
    <form action={onSubmit} className="surface-card p-6 space-y-4">
      <h2 className="font-display text-lg font-semibold text-plum-900">
        {initial ? 'Edit variant' : 'New variant'}
      </h2>
      {initial && <input type="hidden" name="id" value={initial.id} />}
      {!initial && <input type="hidden" name="product_id" value="" />}
      <div className="grid sm:grid-cols-2 gap-4">
        <Input label="Name" name="name" required defaultValue={initial?.name} placeholder="e.g. Gold, Sterling silver" />
        <Input label="SKU" name="sku" defaultValue={initial?.sku || ''} />
        <Input
          label="Price adjustment"
          name="price_adjustment"
          type="number"
          step="0.01"
          defaultValue={initial?.stock_quantity === undefined ? 0 : 0}
        />
        <Input
          label="Stock quantity"
          name="stock_quantity"
          type="number"
          min="0"
          defaultValue={initial?.stock_quantity ?? 0}
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-ink-700">
        <input
          type="checkbox"
          name="is_active"
          defaultChecked={initial ? initial.is_active : true}
          className="h-4 w-4 accent-plum-700"
        />
        Active
      </label>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="btn-ghost px-4 py-2 text-xs">Cancel</button>
        <button type="submit" disabled={pending} className="btn-plum px-5 py-2 text-xs">
          {pending ? 'Saving…' : initial ? 'Save changes' : 'Create variant'}
        </button>
      </div>
    </form>
  );
}
