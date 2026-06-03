'use client';

import { useState, useRef, useEffect } from 'react';
import type { AnalyticsFilters, OrderStatus, PaymentStatus } from '@/lib/admin/analytics/types';

type FilterChipsProps = {
  filters: AnalyticsFilters;
  collections: Array<{ id: string; name: string }>;
  products: Array<{ id: string; name: string }>;
  onChange: (next: AnalyticsFilters) => void;
  className?: string;
};

const ORDER_STATUSES: OrderStatus[] = ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
const PAYMENT_STATUSES: PaymentStatus[] = ['pending', 'paid', 'failed', 'refunded'];

export function FilterChips({ filters, collections, products, onChange, className }: FilterChipsProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const activeCount = filters.collections.length + filters.products.length + filters.statuses.length + filters.paymentStatuses.length;

  function toggleList<T extends string>(list: T[], item: T, max = 50): T[] {
    return list.includes(item) ? list.filter((x) => x !== item) : [...list, item].slice(0, max);
  }

  return (
    <div ref={ref} className={`analytics-control-group ${className ?? ''}`}>
      <button
        type="button"
        className="analytics-control"
        aria-pressed={activeCount > 0}
        onClick={() => setOpen((o) => !o)}
      >
        <span aria-hidden>⚙</span>
        Filters
        {activeCount > 0 && (
          <span className="badge-mint" style={{ marginLeft: 4, padding: '0 0.4rem', fontSize: '0.65rem' }}>{activeCount}</span>
        )}
      </button>
      {open && (
        <div className="analytics-control-dropdown" style={{ minWidth: 280, maxHeight: 400, overflowY: 'auto' }}>
          {collections.length > 0 && (
            <>
              <div className="analytics-control-dropdown__divider" />
              <div className="px-2 py-1 text-xs font-semibold text-plum-800">Collections</div>
              {collections.map((c) => (
                <label key={c.id} className="analytics-control-dropdown__item">
                  <input
                    type="checkbox"
                    checked={filters.collections.includes(c.id)}
                    onChange={() => onChange({ ...filters, collections: toggleList(filters.collections, c.id) })}
                  />
                  {c.name}
                </label>
              ))}
            </>
          )}
          {products.length > 0 && (
            <>
              <div className="analytics-control-dropdown__divider" />
              <div className="px-2 py-1 text-xs font-semibold text-plum-800">Products</div>
              {products.slice(0, 30).map((p) => (
                <label key={p.id} className="analytics-control-dropdown__item">
                  <input
                    type="checkbox"
                    checked={filters.products.includes(p.id)}
                    onChange={() => onChange({ ...filters, products: toggleList(filters.products, p.id) })}
                  />
                  {p.name}
                </label>
              ))}
            </>
          )}
          <div className="analytics-control-dropdown__divider" />
          <div className="px-2 py-1 text-xs font-semibold text-plum-800">Order status</div>
          {ORDER_STATUSES.map((s) => (
            <label key={s} className="analytics-control-dropdown__item">
              <input
                type="checkbox"
                checked={filters.statuses.includes(s)}
                onChange={() => onChange({ ...filters, statuses: toggleList(filters.statuses, s) })}
              />
              {s}
            </label>
          ))}
          <div className="analytics-control-dropdown__divider" />
          <div className="px-2 py-1 text-xs font-semibold text-plum-800">Payment status</div>
          {PAYMENT_STATUSES.map((s) => (
            <label key={s} className="analytics-control-dropdown__item">
              <input
                type="checkbox"
                checked={filters.paymentStatuses.includes(s)}
                onChange={() => onChange({ ...filters, paymentStatuses: toggleList(filters.paymentStatuses, s) })}
              />
              {s}
            </label>
          ))}
          {activeCount > 0 && (
            <>
              <div className="analytics-control-dropdown__divider" />
              <button
                type="button"
                className="analytics-control-dropdown__item"
                onClick={() =>
                  onChange({
                    ...filters,
                    collections: [],
                    products: [],
                    statuses: [],
                    paymentStatuses: [],
                  })
                }
              >
                <span aria-hidden>✕</span>
                Clear all filters
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
