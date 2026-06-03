'use client';

import { useState, useTransition } from 'react';
import { adjustStockAction } from '@/lib/admin/analytics/actions';

type InlineStockAdjustProps = {
  variantId: string;
  currentStock: number;
};

export function InlineStockAdjust({ variantId, currentStock }: InlineStockAdjustProps) {
  const [value, setValue] = useState(currentStock);
  const [saved, setSaved] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const dirty = value !== currentStock;

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const res = await adjustStockAction(variantId, value);
      if (!res.ok) {
        setError(res.error ?? 'Failed');
        return;
      }
      setSaved(value);
      setTimeout(() => setSaved(null), 1500);
    });
  }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
      <input
        type="number"
        min={0}
        className="analytics-stock-input"
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        disabled={pending}
      />
      {dirty && (
        <button type="button" className="analytics-stock-save" onClick={handleSave} disabled={pending}>
          {pending ? '…' : 'Save'}
        </button>
      )}
      {saved !== null && <span className="text-xs text-mint-500">✓</span>}
      {error && <span className="text-xs" style={{ color: 'var(--color-plum-700)' }}>!</span>}
    </span>
  );
}
