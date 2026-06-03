'use client';

import { useState, useTransition } from 'react';
import { Input } from '@/components/ui/Input';
import { upsertContentBlockAction } from '@/lib/admin/actions';

type Block = {
  id: string;
  slug: string;
  title: string | null;
  body: string | null;
  image_url: string | null;
  is_published: boolean;
};

type Props = {
  blocks: Block[];
};

export function AdminContentClient({ blocks }: Props) {
  const [editing, setEditing] = useState<Block | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = (formData: FormData) => {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const res = await upsertContentBlockAction(formData);
      if (res.error) setError(res.error);
      else {
        setSuccess('Content block saved.');
        setEditing(null);
        setShowNew(false);
        setTimeout(() => setSuccess(null), 2500);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button onClick={() => { setShowNew(true); setEditing(null); }} className="btn-plum px-5 py-2 text-xs">
          New block
        </button>
      </div>

      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
      {success && <p className="text-sm text-plum-700" role="status">{success}</p>}

      {(showNew || editing) && (
        <form action={handleSubmit} className="surface-card p-6 space-y-4">
          <h2 className="font-display text-lg font-semibold text-plum-900">
            {editing ? 'Edit block' : 'New block'}
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Input label="Slug" name="slug" required defaultValue={editing?.slug} hint="Unique identifier" />
            <Input label="Title" name="title" defaultValue={editing?.title || ''} />
            <Input label="Image URL" name="image_url" defaultValue={editing?.image_url || ''} />
            <label className="flex items-center gap-2 text-sm text-ink-700 self-end pb-2">
              <input
                type="checkbox"
                name="is_published"
                defaultChecked={editing ? editing.is_published : false}
                className="h-4 w-4 accent-plum-700"
              />
              Published
            </label>
          </div>
          <div>
            <label htmlFor="body" className="block text-sm font-medium text-ink-700 mb-1.5">Body</label>
            <textarea
              id="body"
              name="body"
              rows={4}
              defaultValue={editing?.body || ''}
              className="input-base resize-none"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => { setShowNew(false); setEditing(null); }} className="btn-ghost px-4 py-2 text-xs">Cancel</button>
            <button type="submit" disabled={pending} className="btn-plum px-5 py-2 text-xs">
              {pending ? 'Saving…' : 'Save block'}
            </button>
          </div>
        </form>
      )}

      {blocks.length === 0 ? (
        <div className="text-center py-12 surface-card text-sm text-ink-500">
          No content blocks yet.
        </div>
      ) : (
        <div className="surface-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-cream-100 text-left text-xs uppercase tracking-wider text-ink-500">
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {blocks.map((b) => (
                <tr key={b.id} className="border-t border-cream-200 text-sm">
                  <td className="px-4 py-3 font-mono text-xs text-ink-600">{b.slug}</td>
                  <td className="px-4 py-3 text-ink-800">{b.title || '—'}</td>
                  <td className="px-4 py-3">
                    {b.is_published ? <span className="badge-mint">Published</span> : <span className="badge-soft">Draft</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => { setEditing(b); setShowNew(false); }}
                      className="text-xs font-medium uppercase tracking-wider text-plum-700 hover:text-plum-900 motion-base"
                    >
                      Edit
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
