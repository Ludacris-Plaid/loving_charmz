'use client';

import { useState, useTransition } from 'react';
import { updatePersonalizationAction } from '@/lib/admin/actions';
import { formatDate } from '@/lib/admin/analytics/format';

type Row = {
  id: string;
  status: string;
  pet_name: string | null;
  freeform_text: string | null;
  reference_image_url: string | null;
  charm_selections: string[] | null;
  admin_notes: string | null;
  created_at: string;
  product_name: string | null;
  product_slug: string | null;
};

type Props = {
  rows: Row[];
  statusOptions: Array<{ value: string; label: string }>;
};

const statusStyle: Record<string, string> = {
  pending: 'badge-soft',
  reviewing: 'badge-mint',
  quoted: 'badge-mint',
  in_progress: 'badge-mint',
  completed: 'badge-mint',
  cancelled: 'inline-flex items-center gap-1.5 bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded-pill text-xs font-medium',
};

export function AdminPersonalizationClient({ rows, statusOptions }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleStatus = (id: string, status: string) => {
    setBusy(id);
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set('status', status);
      const res = await updatePersonalizationAction(id, fd);
      if (res.error) setError(res.error);
      setBusy(null);
    });
  };

  const handleNotes = (id: string, formData: FormData) => {
    startTransition(async () => {
      const res = await updatePersonalizationAction(id, formData);
      if (res.error) setError(res.error);
    });
  };

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}

      {rows.length === 0 ? (
        <div className="text-center py-12 surface-card text-sm text-ink-500">
          No personalization requests yet.
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => {
            const isOpen = expanded === row.id;
            return (
              <li key={row.id} className="surface-card p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-ink-800">{row.product_name || 'Custom request'}</p>
                    <p className="text-xs text-ink-500 mt-0.5">
                      Submitted {formatDate(row.created_at)}
                    </p>
                  </div>
                  <span className={statusStyle[row.status] || 'badge-soft'}>{row.status}</span>
                </div>

                {row.pet_name && (
                  <p className="mt-3 text-sm text-ink-700">
                    <span className="text-ink-500">Pet name:</span> {row.pet_name}
                  </p>
                )}

                {isOpen && (
                  <div className="mt-4 space-y-4 text-sm">
                    {row.freeform_text && (
                      <div>
                        <p className="text-xs uppercase tracking-wider text-ink-500 mb-1">Story</p>
                        <p className="text-ink-700 whitespace-pre-wrap">{row.freeform_text}</p>
                      </div>
                    )}
                    {row.charm_selections && row.charm_selections.length > 0 && (
                      <div>
                        <p className="text-xs uppercase tracking-wider text-ink-500 mb-1">Charms</p>
                        <div className="flex flex-wrap gap-1.5">
                          {row.charm_selections.map((c) => (
                            <span key={c} className="badge-plum">{c}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {row.reference_image_url && (
                      <div>
                        <p className="text-xs uppercase tracking-wider text-ink-500 mb-1">Reference</p>
                        <a
                          href={row.reference_image_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-plum-700 hover:text-plum-900 motion-base break-all"
                        >
                          {row.reference_image_url}
                        </a>
                      </div>
                    )}

                    <div>
                      <p className="text-xs uppercase tracking-wider text-ink-500 mb-1">Update status</p>
                      <div className="flex flex-wrap gap-2">
                        {statusOptions.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => handleStatus(row.id, opt.value)}
                            disabled={busy === row.id || row.status === opt.value}
                            className={[
                              'rounded-pill px-3 py-1.5 text-xs font-medium uppercase tracking-wider motion-base',
                              row.status === opt.value
                                ? 'bg-plum-700 text-cream-50'
                                : 'border border-cream-300 bg-surface text-ink-700 hover:border-plum-500 hover:text-plum-700',
                            ].join(' ')}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <form
                      action={(fd) => handleNotes(row.id, fd)}
                      className="space-y-2"
                    >
                      <label htmlFor={`notes-${row.id}`} className="text-xs uppercase tracking-wider text-ink-500">
                        Internal notes
                      </label>
                      <textarea
                        id={`notes-${row.id}`}
                        name="admin_notes"
                        defaultValue={row.admin_notes || ''}
                        rows={3}
                        className="input-base resize-none text-sm"
                      />
                      <input type="hidden" name="status" value={row.status} />
                      <button type="submit" className="btn-outline px-4 py-1.5 text-xs">
                        Save notes
                      </button>
                    </form>
                  </div>
                )}

                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => setExpanded(isOpen ? null : row.id)}
                    className="text-xs font-medium uppercase tracking-wider text-plum-700 hover:text-plum-900 motion-base"
                  >
                    {isOpen ? 'Collapse' : 'Open request'}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
