'use client';

import { useState, useTransition } from 'react';
import {
  createCanadaPostLabelAction,
  downloadCanadaPostLabelAction,
  transmitManifestAction,
  voidCanadaPostLabelAction,
} from '@/lib/shipping/actions';
import { CP_SERVICE_CODES } from '@/lib/shipping/service-codes';


type Props = {
  orderId: string;
  status: string;
  trackingNumber: string | null;
};

/**
 * Canada Post panel inside the Orders tab modal.
 *
 * Without CP credentials every action returns a friendly "not configured"
 * message, so the card is safe to render unconditionally.
 */
export function CanadaPostCard({ orderId, status, trackingNumber }: Props) {
  const [serviceCode, setServiceCode] = useState('DOM.EP');
  const [weight, setWeight] = useState('0.25');
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [, startTransition] = useTransition();

  const run = (key: string, fn: () => Promise<{ error?: string; ok?: boolean }>) => {
    setBusy(key);
    setMessage(null);
    startTransition(async () => {
      const res = await fn();
      setBusy(null);
      if (res.error) {
        setIsError(true);
        setMessage(res.error);
      } else {
        setIsError(false);
        setMessage(
          key === 'label' && 'pin' in res
            ? `Label created — tracking ${'pin' in res ? (res as { pin?: string }).pin : ''}. Ship email sent.`
            : key === 'manifest'
              ? `Transmitted — ${'manifestCount' in res ? (res as { manifestCount?: number }).manifestCount : 0} manifest(s) ready.`
              : 'Done.',
        );
      }
    });
  };

  const createLabel = () => {
    const w = parseFloat(weight);
    if (!Number.isFinite(w) || w <= 0) {
      setIsError(true);
      setMessage('Enter the parcel weight in kg.');
      return;
    }
    setBusy('label');
    setMessage(null);
    startTransition(async () => {
      const res = await createCanadaPostLabelAction(orderId, serviceCode, w, notify);
      setBusy(null);
      if (res.error) {
        setIsError(true);
        setMessage(res.error);
      } else {
        setIsError(false);
        setMessage(`Label created — tracking ${res.pin}. Ship email sent.`);
        // Reload so the modal reflects the shipped state.
        setTimeout(() => window.location.reload(), 1200);
      }
    });
  };

  const downloadLabel = () => {
    setBusy('download');
    setMessage(null);
    startTransition(async () => {
      const res = await downloadCanadaPostLabelAction(orderId);
      setBusy(null);
      if (res.error || !res.pdfBase64) {
        setIsError(true);
        setMessage(res.error || 'No label returned.');
        return;
      }
      try {
        const bin = atob(res.pdfBase64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `canada-post-label-${orderId.slice(0, 8)}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        setIsError(false);
        setMessage('Label downloaded — print it and attach it to the parcel.');
      } catch {
        setIsError(true);
        setMessage('Could not save the PDF in this browser.');
      }
    });
  };

  const voidLabel = () => {
    if (!confirm('Void this Canada Post label? The tracking number will be cleared from the order.')) return;
    setBusy('void');
    setMessage(null);
    startTransition(async () => {
      const res = await voidCanadaPostLabelAction(orderId);
      setBusy(null);
      if (res.error) {
        setIsError(true);
        setMessage(res.error);
      } else {
        setIsError(false);
        setMessage('Label voided. You can create a new one.');
        setTimeout(() => window.location.reload(), 1200);
      }
    });
  };

  return (
    <div className="rounded-xl border border-mint-200 bg-mint-50/60 p-4">
      <p className="text-xs font-bold uppercase tracking-widest text-mint-700 mb-3">
        🍁 Canada Post
      </p>

      {/* Existing label state */}
      {trackingNumber ? (
        <div className="space-y-2 mb-3">
          <p className="text-sm text-ink-800">
            Tracking: <span className="font-mono font-medium">{trackingNumber}</span>
            {' '}<span className="text-xs text-ink-500">(Canada Post PIN)</span>
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={downloadLabel}
              disabled={busy !== null}
              className="rounded-pill px-4 py-2 text-xs font-medium uppercase tracking-wider bg-plum-700 text-cream-50 hover:bg-plum-900 motion-base disabled:opacity-50"
            >
              {busy === 'download' ? 'Downloading…' : '⬇ Label PDF'}
            </button>
            <button
              type="button"
              onClick={voidLabel}
              disabled={busy !== null}
              className="rounded-pill px-4 py-2 text-xs font-medium uppercase tracking-wider border border-red-300 bg-white text-red-700 hover:bg-red-50 motion-base disabled:opacity-50"
            >
              {busy === 'void' ? 'Voiding…' : 'Void label'}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2 mb-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={serviceCode}
              onChange={(e) => setServiceCode(e.target.value)}
              className="flex-1 rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-sm text-ink-800 focus:outline-none focus:ring-2 focus:ring-plum-500"
              aria-label="Canada Post service"
            >
              {CP_SERVICE_CODES.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.label}
                </option>
              ))}
            </select>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="w-28 rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-sm text-ink-800 focus:outline-none focus:ring-2 focus:ring-plum-500"
              aria-label="Parcel weight in kg"
              placeholder="kg"
            />
            <button
              type="button"
              onClick={createLabel}
              disabled={busy !== null}
              className="rounded-pill px-4 py-2 text-xs font-medium uppercase tracking-wider bg-plum-700 text-cream-50 hover:bg-plum-900 motion-base disabled:opacity-50 whitespace-nowrap"
            >
              {busy === 'label' ? 'Creating…' : 'Create label'}
            </button>
          </div>
          <label className="flex items-center gap-2 text-xs text-ink-600">
            <input
              type="checkbox"
              checked={notify}
              onChange={(e) => setNotify(e.target.checked)}
              className="accent-plum-700"
            />
            Also register the customer&apos;s email for Canada Post&apos;s own delivery notifications
          </label>
        </div>
      )}

      {/* Manifest panel — only meaningful for contract mode; harmless otherwise */}
      <details className="text-xs text-ink-600">
        <summary className="cursor-pointer select-none hover:text-plum-700">
          Manifests (contract shipping)
        </summary>
        <button
          type="button"
          onClick={() => run('manifest', transmitManifestAction)}
          disabled={busy !== null}
          className="mt-2 rounded-pill px-4 py-2 text-xs font-medium uppercase tracking-wider border border-cream-300 bg-white text-ink-700 hover:border-plum-500 hover:text-plum-700 motion-base disabled:opacity-50"
        >
          {busy === 'manifest' ? 'Transmitting…' : 'Transmit & build manifest'}
        </button>
      </details>

      {message && (
        <p
          className={`mt-3 text-sm rounded-lg px-3 py-2 ${isError ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-mint-100 text-mint-800 border border-mint-200'}`}
          role="status"
        >
          {message}
        </p>
      )}
    </div>
  );
}
