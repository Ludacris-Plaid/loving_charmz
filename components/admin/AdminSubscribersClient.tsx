'use client';

import { useMemo, useState, useTransition } from 'react';
import { deleteSubscriberAction } from '@/lib/subscribers/actions';

type Subscriber = {
  id: string;
  email: string;
  source: string;
  created_at: string;
};

function toCsv(rows: Subscriber[]): string {
  const head = 'Email,Signup date\n';
  const body = rows
    .map((r) => `${r.email},${new Date(r.created_at).toISOString()}`)
    .join('\n');
  return head + body + (rows.length ? '\n' : '');
}

function toTxt(rows: Subscriber[]): string {
  return rows.map((r) => r.email).join('\n') + (rows.length ? '\n' : '');
}

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function AdminSubscribersClient({ rows }: { rows: Subscriber[] }) {
  const [query, setQuery] = useState('');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.email.toLowerCase().includes(q));
  }, [rows, query]);

  const stamp = new Date().toISOString().slice(0, 10);

  const exportCsv = () => {
    if (filtered.length === 0) return;
    download(`loving-charmz-emails-${stamp}.csv`, toCsv(filtered), 'text/csv');
  };

  const exportTxt = () => {
    if (filtered.length === 0) return;
    download(`loving-charmz-emails-${stamp}.txt`, toTxt(filtered), 'text/plain');
  };

  const handleDelete = (id: string) => {
    if (!window.confirm('Remove this email from the mailing list?')) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteSubscriberAction(id);
      if (res.error) setError(res.error);
    });
  };

  return (
    <div className="space-y-6">
      <div className="surface-card p-5 flex flex-wrap items-center gap-3">
        <p className="text-sm text-ink-700 mr-auto">
          <span className="font-display text-2xl font-semibold text-plum-900">{rows.length}</span>{' '}
          {rows.length === 1 ? 'person has' : 'people have'} signed up
          {query && filtered.length !== rows.length && (
            <span className="text-ink-500"> · {filtered.length} matching your search</span>
          )}
        </p>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search emails…"
          aria-label="Search emails"
          className="input-base w-56 py-2 text-sm"
        />
        <button
          type="button"
          onClick={exportCsv}
          disabled={filtered.length === 0}
          className="btn-plum px-5 py-2.5 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Download CSV
        </button>
        <button
          type="button"
          onClick={exportTxt}
          disabled={filtered.length === 0}
          className="btn-outline px-5 py-2.5 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Download TXT
        </button>
      </div>

      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}

      {rows.length === 0 ? (
        <div className="surface-card text-center py-16">
          <p className="font-display text-lg font-semibold text-plum-900">No signups yet</p>
          <p className="text-sm text-ink-600 mt-2 max-w-md mx-auto">
            When someone types their email into the welcome pop-up on the shop and
            clicks <strong>Get my 10% off</strong>, their address will appear here
            automatically. Nothing to do until then — this page will fill up on its own.
          </p>
        </div>
      ) : (
        <div className="surface-card overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-cream-100 text-left text-xs uppercase tracking-wider text-ink-500">
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Signed up</th>
                <th className="px-4 py-3 text-right">Remove</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-cream-200 text-sm">
                  <td className="px-4 py-3 text-ink-800">{r.email}</td>
                  <td className="px-4 py-3 text-ink-500 whitespace-nowrap">{formatDate(r.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleDelete(r.id)}
                      disabled={pending}
                      className="text-xs font-medium uppercase tracking-wider text-red-600 hover:text-red-700 motion-base disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-sm text-ink-500">
                    No emails match “{query}”.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
