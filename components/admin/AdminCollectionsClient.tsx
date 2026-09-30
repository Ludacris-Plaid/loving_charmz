'use client';

import { useState, useTransition } from 'react';
import { Input } from '@/components/ui/Input';
import { SingleImageUpload } from '@/components/admin/SingleImageUpload';
import { upsertCollectionAction, deleteCollectionAction } from '@/lib/admin/collections-and-variants';

type Collection = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  product_ids: string[];
};

type Product = {
  id: string;
  name: string;
  base_price: number;
  is_active: boolean;
  image: string | null;
};

type Props = {
  collections: Collection[];
  products: Product[];
};

export function AdminCollectionsClient({ collections, products }: Props) {
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
    if (!confirm('Delete this collection? The products themselves stay in the shop.')) return;
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
          key={editing?.id ?? 'new'}
          initial={editing}
          products={products}
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
                  <td className="px-4 py-3 text-ink-700">
                    {c.product_ids.length > 0 ? (
                      <span>
                        {c.product_ids.length}
                        <span className="text-xs text-ink-500"> · {productNames(c.product_ids, products)}</span>
                      </span>
                    ) : (
                      <span className="text-xs text-ink-500">None yet</span>
                    )}
                  </td>
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

/** "Companion Charm, Best Friend +2 more" — enough to recognise, not a wall. */
function productNames(ids: string[], products: Product[]): string {
  const byId = new Map(products.map((p) => [p.id, p.name]));
  const names = ids.map((id) => byId.get(id)).filter((n): n is string => Boolean(n));
  if (names.length <= 2) return names.join(', ');
  return `${names.slice(0, 2).join(', ')} +${names.length - 2} more`;
}

type FormProps = {
  initial: Collection | null;
  products: Product[];
  pending: boolean;
  onCancel: () => void;
  onSubmit: (formData: FormData) => void;
};

function CollectionForm({ initial, products, pending, onCancel, onSubmit }: FormProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(initial?.image_url || null);
  // Chosen product ids, in display order. Kept as ids (not objects) so the
  // order the admin sees is exactly the order that gets saved.
  const [selectedIds, setSelectedIds] = useState<string[]>(initial?.product_ids ?? []);
  const [query, setQuery] = useState('');

  const selected = selectedIds
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is Product => Boolean(p));
  const available = products.filter(
    (p) => !selectedIds.includes(p.id) && p.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const toggle = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const move = (id: string, delta: number) => {
    setSelectedIds((prev) => {
      const index = prev.indexOf(id);
      const target = index + delta;
      if (index < 0 || target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  return (
    <form action={onSubmit} className="surface-card p-6 space-y-4">
      <h2 className="font-display text-lg font-semibold text-plum-900">
        {initial ? 'Edit collection' : 'New collection'}
      </h2>
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <input type="hidden" name="image_url" value={imageUrl || ''} />
      <input type="hidden" name="productIds" value={JSON.stringify(selectedIds)} />
      <div className="grid sm:grid-cols-2 gap-4">
        <Input label="Name" name="name" required defaultValue={initial?.name} />
        <Input label="Slug" name="slug" required defaultValue={initial?.slug} />
        <Input
          label="Sort order"
          name="sort_order"
          type="number"
          defaultValue={initial?.sort_order ?? 0}
        />
      </div>
      <SingleImageUpload value={imageUrl} onChange={setImageUrl} folder="collections" label="Collection image" />
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

      {/* ---- Products in this collection ---- */}
      <div className="border-t border-cream-200 pt-4">
        <p className="text-sm font-medium text-ink-700">Products in this collection</p>
        <p className="text-xs text-ink-500 mt-1 mb-3">
          Tick a piece to add it. Use the arrows to set the order customers see them in. Products can live in more than one collection.
        </p>

        {selected.length > 0 && (
          <ul className="space-y-1.5 mb-4">
            {selected.map((p, i) => (
              <li key={p.id} className="flex items-center gap-3 rounded-md border border-plum-200 bg-plum-50/40 px-3 py-2">
                <span className="text-xs text-ink-500 w-4">{i + 1}</span>
                {p.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image} alt="" className="h-8 w-8 rounded object-cover border border-cream-300" />
                )}
                <span className="text-sm font-medium text-ink-800 flex-1">{p.name}</span>
                <span className="text-xs text-ink-500">${p.base_price.toFixed(2)}</span>
                {!p.is_active && <span className="badge-soft">Hidden</span>}
                <button
                  type="button"
                  onClick={() => move(p.id, -1)}
                  disabled={i === 0}
                  aria-label={`Move ${p.name} up`}
                  className="px-1.5 text-ink-500 hover:text-plum-700 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(p.id, 1)}
                  disabled={i === selected.length - 1}
                  aria-label={`Move ${p.name} down`}
                  className="px-1.5 text-ink-500 hover:text-plum-700 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => toggle(p.id)}
                  aria-label={`Remove ${p.name} from collection`}
                  className="px-1.5 text-ink-500 hover:text-red-600"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}

        {products.length === 0 ? (
          <p className="text-xs text-ink-500">No products in the shop yet — create one under Products first.</p>
        ) : (
          <div className="rounded-md border border-cream-300">
            <div className="border-b border-cream-200 p-2">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search pieces…"
                aria-label="Search products to add"
                className="input-base py-1.5 text-sm"
              />
            </div>
            <ul className="max-h-56 overflow-y-auto divide-y divide-cream-200">
              {available.map((p) => (
                <li key={p.id}>
                  <label className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-cream-50">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(p.id)}
                      onChange={() => toggle(p.id)}
                      className="h-4 w-4 accent-plum-700"
                    />
                    {p.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.image} alt="" className="h-8 w-8 rounded object-cover border border-cream-300" />
                    )}
                    <span className="text-sm text-ink-800 flex-1">{p.name}</span>
                    <span className="text-xs text-ink-500">${p.base_price.toFixed(2)}</span>
                    {!p.is_active && <span className="badge-soft">Hidden</span>}
                  </label>
                </li>
              ))}
              {available.length === 0 && (
                <li className="px-3 py-3 text-xs text-ink-500">
                  {query.trim() ? 'No pieces match that search.' : 'Every product is already in this collection.'}
                </li>
              )}
            </ul>
          </div>
        )}
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