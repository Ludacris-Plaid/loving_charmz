'use client';

import { useState, useTransition } from 'react';
import { Input } from '@/components/ui/Input';
import { ProductImageUpload } from '@/components/admin/ProductImageUpload';
import {
  createProductAction,
  updateProductAction,
  deleteProductAction,
} from '@/lib/admin/actions';

type Product = {
  id: string;
  name: string;
  slug: string;
  base_price: number;
  is_active: boolean;
  is_personalizable: boolean;
  variant_count: number;
  total_stock: number;
  tagline: string | null;
  description: string | null;
  images: string[];
};

type Props = {
  initialProducts: Product[];
};

export function AdminProductsClient({ initialProducts }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const startCreate = () => {
    setEditing(null);
    setError(null);
    setShowForm(true);
  };

  const startEdit = (product: Product) => {
    setEditing(product);
    setError(null);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
  };

  const handleSubmit = (formData: FormData) => {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const res = editing
        ? await updateProductAction(editing.id, formData)
        : await createProductAction(formData);
      if (res.error) setError(res.error);
      else {
        setSuccess(editing ? 'Product updated.' : 'Product created.');
        closeForm();
        setTimeout(() => setSuccess(null), 2500);
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete this product? This cannot be undone.')) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteProductAction(id);
      if (res.error) setError(res.error);
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-600">
          {initialProducts.length} product{initialProducts.length === 1 ? '' : 's'}
        </p>
        <button onClick={startCreate} className="btn-plum px-5 py-2 text-xs">
          Add product
        </button>
      </div>

      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
      {success && <p className="text-sm text-plum-700" role="status">{success}</p>}

      {showForm && (
        <ProductForm
          initial={editing}
          pending={pending}
          onCancel={closeForm}
          onSubmit={handleSubmit}
        />
      )}

      <div className="surface-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-cream-100 text-left text-xs uppercase tracking-wider text-ink-500">
              <th className="px-4 py-3 w-16">Image</th>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {initialProducts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-ink-500">
                  No products yet — add your first piece to get started.
                </td>
              </tr>
            ) : (
              initialProducts.map((p) => (
                <tr key={p.id} className="border-t border-cream-200 text-sm">
                  <td className="px-4 py-3">
                    {p.images[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.images[0]}
                        alt=""
                        className="h-12 w-12 rounded-md border border-cream-300 object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-md border border-dashed border-cream-300 text-[10px] text-ink-400">
                        No img
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink-800">{p.name}</p>
                    <p className="text-xs text-ink-500">/{p.slug}</p>
                  </td>
                  <td className="px-4 py-3 font-medium text-plum-700">${p.base_price.toFixed(2)}</td>
                  <td className="px-4 py-3 text-ink-700">
                    {p.total_stock}
                    <span className="text-xs text-ink-500"> ({p.variant_count} variants)</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={p.is_active ? 'badge-mint' : 'badge-soft'}>
                      {p.is_active ? 'Active' : 'Inactive'}
                    </span>
                    {p.is_personalizable && (
                      <span className="ml-1 badge-plum">Custom</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      onClick={() => startEdit(p)}
                      className="text-xs font-medium uppercase tracking-wider text-plum-700 hover:text-plum-900 motion-base"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      disabled={pending}
                      className="text-xs font-medium uppercase tracking-wider text-red-600 hover:text-red-700 motion-base"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type FormProps = {
  initial: Product | null;
  pending: boolean;
  onCancel: () => void;
  onSubmit: (formData: FormData) => void;
};

function ProductForm({ initial, pending, onCancel, onSubmit }: FormProps) {
  const [images, setImages] = useState<string[]>(initial?.images || []);
  const [imageError, setImageError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setImageError(null);
    if (images.length === 0) {
      setImageError('Add at least one image before saving.');
      return;
    }
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.set('images', JSON.stringify(images));
    onSubmit(fd);
  }

  return (
    <form onSubmit={handleSubmit} className="surface-card p-6 space-y-5">
      <h2 className="font-display text-lg font-semibold text-plum-900">
        {initial ? 'Edit product' : 'New product'}
      </h2>
      <div className="grid sm:grid-cols-2 gap-4">
        <Input
          label="Name"
          name="name"
          required
          defaultValue={initial?.name}
        />
        <Input
          label="Slug"
          name="slug"
          required
          defaultValue={initial?.slug}
          hint="Used in the URL — lowercase and hyphenated."
        />
        <Input
          label="Base price (USD)"
          name="base_price"
          type="number"
          step="0.01"
          min="0"
          required
          defaultValue={initial?.base_price ?? 55}
        />
        <Input
          label="Tagline"
          name="tagline"
          defaultValue={initial?.tagline || ''}
          placeholder="Short, evocative line"
        />
      </div>
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-ink-700 mb-1.5">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={initial?.description || ''}
          className="input-base resize-none"
        />
      </div>
      <ProductImageUpload
        value={images}
        onChange={(urls) => {
          setImages(urls);
          if (imageError && urls.length > 0) setImageError(null);
        }}
        productSlug={initial?.slug}
        disabled={pending}
      />
      {imageError && (
        <p className="text-xs text-red-600" role="alert">
          {imageError}
        </p>
      )}
      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-sm text-ink-700">
          <input
            type="checkbox"
            name="is_active"
            defaultChecked={initial ? initial.is_active : true}
            className="h-4 w-4 accent-plum-700"
          />
          Active
        </label>
        <label className="flex items-center gap-2 text-sm text-ink-700">
          <input
            type="checkbox"
            name="is_personalizable"
            defaultChecked={initial?.is_personalizable}
            className="h-4 w-4 accent-plum-700"
          />
          Personalizable
        </label>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="btn-ghost px-4 py-2 text-xs">
          Cancel
        </button>
        <button type="submit" disabled={pending} className="btn-plum px-5 py-2 text-xs">
          {pending ? 'Saving…' : initial ? 'Save changes' : 'Create product'}
        </button>
      </div>
    </form>
  );
}
