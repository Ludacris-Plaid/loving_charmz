'use client';

import { useState, useRef, useEffect } from 'react';
import type { AnalyticsFilters } from '@/lib/admin/analytics/types';
import { encodeFilters, decodeFilters } from '@/lib/admin/analytics/urlState';

const STORAGE_KEY = 'loving_charmz_analytics_views';

type SavedView = { id: string; name: string; params: string; created_at: string };

function loadViews(): SavedView[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveViews(views: SavedView[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(views));
}

type SavedViewsMenuProps = {
  filters: AnalyticsFilters;
  onChange: (next: AnalyticsFilters) => void;
  className?: string;
};

export function SavedViewsMenu({ filters, onChange, className }: SavedViewsMenuProps) {
  const [open, setOpen] = useState(false);
  const [views, setViews] = useState<SavedView[]>(() => loadViews());
  const [name, setName] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  function handleSave() {
    if (!name.trim()) return;
    const params = encodeFilters(filters).toString();
    const view: SavedView = {
      id: crypto.randomUUID(),
      name: name.trim(),
      params,
      created_at: new Date().toISOString(),
    };
    const next = [...views, view];
    setViews(next);
    saveViews(next);
    setName('');
  }

  function handleLoad(view: SavedView) {
    const params = new URLSearchParams(view.params);
    onChange(decodeFilters(params));
    setOpen(false);
  }

  function handleDelete(id: string) {
    const next = views.filter((v) => v.id !== id);
    setViews(next);
    saveViews(next);
  }

  return (
    <div ref={ref} className={`analytics-control-group ${className ?? ''}`}>
      <button type="button" className="analytics-control" onClick={() => setOpen((o) => !o)}>
        <span aria-hidden>★</span>
        Saved views
        {views.length > 0 && <span className="text-xs text-ink-500">({views.length})</span>}
      </button>
      {open && (
        <div className="analytics-control-dropdown" style={{ minWidth: 280 }}>
          {views.length === 0 ? (
            <div className="px-3 py-2 text-xs text-ink-500">No saved views yet.</div>
          ) : (
            views.map((v) => (
              <div key={v.id} className="analytics-control-dropdown__item" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button
                  type="button"
                  onClick={() => handleLoad(v)}
                  style={{ background: 'none', border: 'none', textAlign: 'left', flex: 1, padding: 0, cursor: 'pointer' }}
                >
                  {v.name}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(v.id)}
                  style={{ background: 'none', border: 'none', color: 'var(--color-ink-400)', cursor: 'pointer' }}
                  aria-label={`Delete ${v.name}`}
                >
                  ×
                </button>
              </div>
            ))
          )}
          <div className="analytics-control-dropdown__divider" />
          <div className="p-2 flex gap-1">
            <input
              type="text"
              placeholder="Name this view…"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ flex: 1, padding: '0.3rem 0.5rem', border: '1px solid var(--color-cream-300)', borderRadius: 6, fontSize: '0.75rem' }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
            />
            <button type="button" className="analytics-control" onClick={handleSave} disabled={!name.trim()}>
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
