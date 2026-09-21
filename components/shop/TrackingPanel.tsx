'use client';

import { useEffect, useReducer } from 'react';

type TrackState = {
  state: 'idle' | 'loading' | 'ok' | 'error' | 'unavailable';
  status?: string | null;
  expectedDelivery?: string | null;
  lastEvent?: { date: string | null; description: string | null; site: string | null } | null;
  error?: string | null;
};

function trackingReducer(_prev: TrackState, action: { type: 'start' } | { type: 'resolve'; value: TrackState }): TrackState {
  if (action.type === 'start') return { state: 'loading' };
  return action.value;
}

/**
 * Live Canada Post tracking for the customer's order.
 *
 * Fetches through /api/tracking/[pin] (never calls Canada Post directly
 * from the browser — the API key must stay server-side). Falls back to
 * the plain tracking number + public Canada Post link when the API is
 * not configured or errors, so the panel is never worse than the
 * static display it replaces.
 */
export function TrackingPanel({ pin, carrier }: { pin: string; carrier: string | null }) {
  const [state, dispatch] = useReducer(trackingReducer, { state: 'idle' });

  useEffect(() => {
    let cancelled = false;
    dispatch({ type: 'start' });
    fetch(`/api/tracking/${encodeURIComponent(pin)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data) => {
        if (cancelled) return;
        if (data?.available === false) {
          dispatch({ type: 'resolve', value: { state: 'unavailable' } });
        } else if (data?.error) {
          dispatch({ type: 'resolve', value: { state: 'error', error: data.error } });
        } else {
          dispatch({
            type: 'resolve',
            value: {
              state: 'ok',
              status: data.status,
              expectedDelivery: data.expectedDelivery,
              lastEvent: data.lastEvent ?? null,
            },
          });
        }
      })
      .catch(() => {
        if (!cancelled) dispatch({ type: 'resolve', value: { state: 'unavailable' } });
      });
    return () => {
      cancelled = true;
    };
  }, [pin]);

  const cpLink = `https://www.canadapost-postescanada.ca/track-reperage/en#/details/${encodeURIComponent(pin)}`;

  return (
    <div className="mt-3 rounded-lg bg-mint-50 border border-mint-200 px-3 py-2 text-sm">
      <span className="font-medium text-mint-800">Tracking:</span>{' '}
      {carrier && <span className="text-ink-700">{carrier} </span>}
      <span className="font-mono text-ink-800">{pin}</span>

      {state.state === 'loading' && (
        <span className="ml-2 text-xs text-ink-500">checking status…</span>
      )}

      {state.state === 'ok' && (
        <div className="mt-1.5 text-xs text-ink-700 space-y-0.5">
          <p>
            <span className="font-medium">{state.status || 'In transit'}</span>
            {state.expectedDelivery && (
              <span className="text-ink-500"> · expected {state.expectedDelivery}</span>
            )}
          </p>
          {state.lastEvent?.description && (
            <p className="text-ink-500">
              {state.lastEvent.description}
              {state.lastEvent.site ? ` — ${state.lastEvent.site}` : ''}
              {state.lastEvent.date ? ` · ${state.lastEvent.date}` : ''}
            </p>
          )}
        </div>
      )}

      {state.state === 'error' && (
        <p className="mt-1.5 text-xs text-ink-500">
          Live status unavailable right now — use the Canada Post link below.
        </p>
      )}
      {/* unavailable: no extra text, the link below carries the experience */}

      <a
        href={cpLink}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1.5 inline-block text-xs font-medium text-plum-700 hover:text-plum-900 underline underline-offset-2"
      >
        Track on canadapost.ca ↗
      </a>
    </div>
  );
}
