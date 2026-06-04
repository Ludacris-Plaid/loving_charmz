'use client';

import { useState, useRef, useEffect } from 'react';
import type { AnalyticsFilters, DateRangePreset, Granularity } from '@/lib/admin/analytics/types';
import { formatShortDate } from '@/lib/admin/analytics/format';

type DateRangePickerProps = {
  filters: AnalyticsFilters;
  onChange: (next: AnalyticsFilters) => void;
  className?: string;
};

const PRESETS: { value: DateRangePreset; label: string }[] = [
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
  { value: 'ytd', label: 'YTD' },
  { value: 'custom', label: 'Custom' },
];

const GRANULARITIES: { value: Granularity; label: string }[] = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
];

function formatRangeLabel(filters: AnalyticsFilters): string {
  if (filters.preset === 'custom' && filters.start && filters.end) {
    return `${formatShortDate(filters.start)} – ${formatShortDate(filters.end)}`;
  }
  const map: Record<DateRangePreset, string> = { '7d': 'Last 7 days', '30d': 'Last 30 days', '90d': 'Last 90 days', ytd: 'Year to date', custom: 'Custom' };
  return map[filters.preset];
}

export function DateRangePicker({ filters, onChange, className }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <div ref={ref} className={`analytics-control-group ${className ?? ''}`}>
      <button
        type="button"
        className="analytics-control"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span aria-hidden>📅</span>
        {formatRangeLabel(filters)}
        <span aria-hidden style={{ fontSize: '0.6rem', marginLeft: 4 }}>▾</span>
      </button>
      {open && (
        <div className="analytics-control-dropdown" style={{ minWidth: 320 }}>
          <div className="analytics-preset-row" style={{ padding: '0.25rem 0.5rem' }}>
            {PRESETS.map((p) => (
              <button
                key={p.value}
                type="button"
                className="analytics-control"
                aria-pressed={filters.preset === p.value}
                onClick={() => onChange({ ...filters, preset: p.value })}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="analytics-control-dropdown__divider" />
          <div className="analytics-range-form">
            <label className="text-xs text-ink-500">From</label>
            <input
              type="date"
              value={filters.start}
              onChange={(e) => onChange({ ...filters, preset: 'custom', start: e.target.value })}
            />
            <label className="text-xs text-ink-500">To</label>
            <input
              type="date"
              value={filters.end}
              onChange={(e) => onChange({ ...filters, preset: 'custom', end: e.target.value })}
            />
          </div>
          <div className="analytics-control-dropdown__divider" />
          <div className="analytics-preset-row" style={{ padding: '0.25rem 0.5rem' }}>
            {GRANULARITIES.map((g) => (
              <button
                key={g.value}
                type="button"
                className="analytics-control"
                aria-pressed={filters.granularity === g.value}
                onClick={() => onChange({ ...filters, granularity: g.value })}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
