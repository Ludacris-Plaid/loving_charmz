'use client';

import { useState, useTransition } from 'react';
import { Input } from '@/components/ui/Input';
import { upsertCollectionAction, deleteCollectionAction } from '@/lib/admin/collections-and-variants';

type Collection = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  product_count: number;
};

type Props = {
  collections: Collection[];
};

export function AdminCollectionsClient({ collections }: Props) {
  const [editing, setEditing] = useState<Collection | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = (formData: FormData) => {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const res = await upsertCollectionAction(formData);
      if (res.error) setError(res.error);
      else {
        setSuccess(editing ? 'Collection updated.' : 'Collection created.');
        setEditing(null);
        setShowNew(false);
        setTimeout(() => setSuccess(null), 2500);
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete this collection?')) return;
    startTransition(async () => {
      const res = await deleteCollectionAction(id);
      if (res.error) setError(res.error);
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button onClick={() => { setShowNew(true); setEditing(null); }} className="btn-plum px-5 py-2 text-xs">
          New collection
        </button>
      </div>

      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
      {success && <p className="text-sm text-plum-700" role="status">{success}</p>}

      {(showNew || editing) && (
        <CollectionForm
          initial={editing}
          pending={pending}
          onCancel={() => { setShowNew(false); setEditing(null); }}
          onSubmit={handleSubmit}
        />
      )}

      {collections.length === 0 ? (
        <div className="text-center py-12 surface-card text-sm text-ink-500">
          No collections yet.
        </div>
      ) : (
        <div className="surface-card overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-cream-100 text-left text-xs uppercase tracking-wider text-ink-500">
                <th className="px-4 py-3">Collection</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Products</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {collections.map((c) => (
                <tr key={c.id} className="border-t border-cream-200 text-sm">
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink-800">{c.name}</p>
                    {c.description && <p className="text-xs text-ink-500 mt-0.5 line-clamp-1">{c.description}</p>}
                  </td>
                  <td className="px-4 py-3 text-ink-600 font-mono text-xs">/{c.slug}</td>
                  <td className="px-4 py-3 text-ink-700">{c.product_count}</td>
                  <td className="px-4 py-3">
                    {c.is_active ? <span className="badge-mint">Active</span> : <span className="badge-soft">Inactive</span>}
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button onClick={() => { setEditing(c); setShowNew(false); }} className="text-xs font-medium uppercase tracking-wider text-plum-700 hover:text-plum-900 motion-base">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(c.id)} className="text-xs font-medium uppercase tracking-wider text-red-600 hover:text-red-700 motion-base">
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
  initial: Collection | null;
  pending: boolean;
  onCancel: () => void;
  onSubmit: (formData: FormData) => void;
};

function CollectionForm({ initial, pending, onCancel, onSubmit }: FormProps) {
  return (
    <form action={onSubmit} className="surface-card p-6 space-y-4">
      <h2 className="font-display text-lg font-semibold text-plum-900">
        {initial ? 'Edit collection' : 'New collection'}
      </h2>
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <div className="grid sm:grid-cols-2 gap-4">
        <Input label="Name" name="name" required defaultValue={initial?.name} />
        <Input label="Slug" name="slug" required defaultValue={initial?.slug} />
        <Input
          label="Sort order"
          name="sort_order"
          type="number"
          defaultValue={initial?.sort_order ?? 0}
        />
        <Input label="Image URL" name="image_url" defaultValue={initial?.image_url || ''} />
      </div>
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-ink-700 mb-1.5">Description</label>
        <textarea
          id="description"
          name="description"
          rows={2}
          defaultValue={initial?.description || ''}
          className="input-base resize-none"
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
          {pending ? 'Saving…' : initial ? 'Save changes' : 'Create collection'}
        </button>
      </div>
    </form>
  );
}
