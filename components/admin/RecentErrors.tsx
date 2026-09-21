'use client';

import { useState } from 'react';

type ErrorEvent = {
  id: string;
  message: string;
  source: string | null;
  path: string | null;
  stack: string | null;
  digest: string | null;
  user_agent: string | null;
  created_at: string;
};

/**
 * Renders the recent-errors list for the admin monitoring page with a
 * copy button per error. The clipboard payload is the full structured
 * error — message, source, path, digest, user agent, timestamp, stack —
 * ready to paste into a bug report or hand to a developer.
 */
export function RecentErrors({ errors }: { errors: ErrorEvent[] }) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (errors.length === 0) {
    return <p className="text-sm text-ink-500">No errors recorded. 🎉</p>;
  }

  const copyError = async (err: ErrorEvent) => {
    const lines = [
      `Error: ${err.message}`,
      `Source: ${err.source || 'unknown'}`,
      err.path ? `Path: ${err.path}` : null,
      err.digest ? `Digest: ${err.digest}` : null,
      err.user_agent ? `User agent: ${err.user_agent}` : null,
      `Time: ${new Date(err.created_at).toISOString()}`,
      err.stack ? `\nStack:\n${err.stack}` : null,
    ].filter(Boolean);
    const text = lines.join('\n');

    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(err.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Clipboard can be denied (e.g. insecure context) — fail silently.
    }
  };

  return (
    <div className="space-y-3">
      {errors.map((err) => (
        <div key={err.id} className="rounded-lg border border-red-200 bg-red-50 p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-red-800 truncate">{err.message}</p>
              {err.path && (
                <p className="text-xs text-red-600 font-mono mt-0.5">{err.path}</p>
              )}
              {err.stack && (
                <pre className="text-xs text-red-600 mt-2 overflow-x-auto whitespace-pre-wrap max-h-24 overflow-y-auto">
                  {err.stack}
                </pre>
              )}
            </div>
            <div className="shrink-0 text-right space-y-2">
              <span className="badge-soft text-xs">{err.source}</span>
              <p className="text-xs text-ink-400">
                {new Date(err.created_at).toLocaleString()}
              </p>
              <button
                onClick={() => copyError(err)}
                className="rounded-pill px-3 py-1 text-xs font-medium uppercase tracking-wider border border-red-300 bg-white text-red-700 hover:bg-red-100 motion-base"
                type="button"
                aria-label={`Copy error details: ${err.message}`}
              >
                {copiedId === err.id ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
