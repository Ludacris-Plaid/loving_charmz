'use client';

import { useState, useTransition } from 'react';
import { createAnnotationAction, deleteAnnotationAction } from '@/lib/admin/analytics/actions';
import type { AnnotationRow } from '@/lib/admin/analytics/types';

type AnnotationDialogProps = {
  annotations: AnnotationRow[];
  onCreated?: () => void;
};

const COLORS: Array<{ value: 'plum' | 'mint' | 'cream' | 'ink'; label: string }> = [
  { value: 'plum', label: 'Plum' },
  { value: 'mint', label: 'Mint' },
  { value: 'cream', label: 'Cream' },
  { value: 'ink', label: 'Ink' },
];

const COLOR_BG: Record<string, string> = {
  plum: 'var(--color-plum-500)',
  mint: 'var(--color-mint-500)',
  cream: 'var(--color-cream-300)',
  ink: 'var(--color-ink-500)',
};

export function AnnotationDialog({ annotations }: AnnotationDialogProps) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [color, setColor] = useState<'plum' | 'mint' | 'cream' | 'ink'>('plum');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleCreate() {
    setError(null);
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    startTransition(async () => {
      const res = await createAnnotationAction({ annotation_date: date, title, body, color });
      if (!res.ok) {
        setError(res.error ?? 'Failed to save');
        return;
      }
      setTitle('');
      setBody('');
      setOpen(false);
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteAnnotationAction(id);
    });
  }

  return (
    <div className="analytics-control-group">
      <button type="button" className="analytics-control" onClick={() => setOpen((o) => !o)}>
        <span aria-hidden>📌</span>
        Annotations
        {annotations.length > 0 && <span className="text-xs text-ink-500">({annotations.length})</span>}
      </button>
      {open && (
        <div className="analytics-control-dropdown" style={{ minWidth: 320, maxHeight: 480, overflowY: 'auto' }}>
          {annotations.length > 0 && (
            <div className="analytics-annotation-list" style={{ padding: '0.25rem 0.5rem' }}>
              {annotations.map((a) => (
                <div key={a.id} className="analytics-annotation">
                  <span className="analytics-annotation-marker" style={{ background: COLOR_BG[a.color] }} />
                  <div className="analytics-annotation-content">
                    <div className="analytics-annotation-date">{a.annotation_date}</div>
                    <div className="analytics-annotation-title">{a.title}</div>
                    {a.body && <div className="analytics-annotation-body">{a.body}</div>}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(a.id)}
                    style={{ background: 'none', border: 'none', color: 'var(--color-ink-400)', cursor: 'pointer' }}
                    aria-label="Delete"
                  >
                    ×
                  </button>
                </div>
              ))}
              <div className="analytics-control-dropdown__divider" />
            </div>
          )}
          <div className="p-2 space-y-2">
            <div className="text-xs font-semibold text-plum-800">Add annotation</div>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{ width: '100%', padding: '0.3rem 0.5rem', border: '1px solid var(--color-cream-300)', borderRadius: 6, fontSize: '0.75rem' }}
            />
            <input
              type="text"
              placeholder="Title (e.g. Summer sale launch)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{ width: '100%', padding: '0.3rem 0.5rem', border: '1px solid var(--color-cream-300)', borderRadius: 6, fontSize: '0.75rem' }}
            />
            <textarea
              placeholder="Optional body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={2}
              style={{ width: '100%', padding: '0.3rem 0.5rem', border: '1px solid var(--color-cream-300)', borderRadius: 6, fontSize: '0.75rem', resize: 'vertical' }}
            />
            <div className="flex items-center gap-1">
              {COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  aria-pressed={color === c.value}
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 9,
                    background: COLOR_BG[c.value],
                    border: color === c.value ? '2px solid var(--color-plum-700)' : '1px solid var(--color-cream-300)',
                    cursor: 'pointer',
                  }}
                  aria-label={c.label}
                />
              ))}
              <button
                type="button"
                onClick={handleCreate}
                disabled={pending || !title.trim()}
                className="analytics-stock-save"
                style={{ marginLeft: 'auto' }}
              >
                {pending ? '…' : 'Add'}
              </button>
            </div>
            {error && <div className="text-xs" style={{ color: 'var(--color-plum-700)' }}>{error}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
