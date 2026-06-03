import { describe, it, expect } from 'vitest';
import {
  decodeFilters,
  encodeFilters,
  isWidgetVisible,
  toggleWidget,
  reorderWidgets,
  DEFAULT_FILTERS,
  ALL_WIDGETS,
} from '@/lib/admin/analytics/urlState';
import type { AnalyticsFilters } from '@/lib/admin/analytics/types';

describe('decodeFilters', () => {
  it('returns defaults for empty params', () => {
    const f = decodeFilters(new URLSearchParams());
    expect(f.preset).toBe('30d');
    expect(f.granularity).toBe('day');
    expect(f.compare).toBe(true);
    expect(f.widgets).toEqual([...ALL_WIDGETS]);
  });
  it('rejects invalid preset', () => {
    const f = decodeFilters(new URLSearchParams('p=invalid'));
    expect(f.preset).toBe('30d');
  });
  it('rejects invalid granularity', () => {
    const f = decodeFilters(new URLSearchParams('g=hourly'));
    expect(f.granularity).toBe('day');
  });
  it('parses preset + granularity + compare=0', () => {
    const f = decodeFilters(new URLSearchParams('p=90d&g=week&c=0'));
    expect(f.preset).toBe('90d');
    expect(f.granularity).toBe('week');
    expect(f.compare).toBe(false);
  });
  it('parses comma-separated collections', () => {
    const f = decodeFilters(new URLSearchParams('col=a,b,c'));
    expect(f.collections).toEqual(['a', 'b', 'c']);
  });
  it('parses statuses and filters invalid', () => {
    const f = decodeFilters(new URLSearchParams('st=pending,unknown,paid'));
    expect(f.statuses).toEqual(['pending']);
  });
  it('falls back to all widgets when list is empty', () => {
    const f = decodeFilters(new URLSearchParams('w='));
    expect(f.widgets.length).toBe(ALL_WIDGETS.length);
  });
});

describe('encodeFilters', () => {
  it('omits default preset', () => {
    const params = encodeFilters({ ...DEFAULT_FILTERS });
    expect(params.get('p')).toBeNull();
  });
  it('encodes non-default preset', () => {
    const params = encodeFilters({ ...DEFAULT_FILTERS, preset: '7d' });
    expect(params.get('p')).toBe('7d');
  });
  it('encodes custom range only when preset=custom', () => {
    const params = encodeFilters({ ...DEFAULT_FILTERS, preset: 'custom', start: '2026-01-01', end: '2026-01-15' });
    expect(params.get('s')).toBe('2026-01-01');
    expect(params.get('e')).toBe('2026-01-15');
  });
  it('omits custom start/end for non-custom presets', () => {
    const params = encodeFilters({ ...DEFAULT_FILTERS, start: '2026-01-01', end: '2026-01-15' });
    expect(params.get('s')).toBeNull();
  });
  it('encodes compare=0 only when false', () => {
    const params1 = encodeFilters({ ...DEFAULT_FILTERS, compare: false });
    expect(params1.get('c')).toBe('0');
    const params2 = encodeFilters({ ...DEFAULT_FILTERS, compare: true });
    expect(params2.get('c')).toBeNull();
  });
  it('omits empty filter lists', () => {
    const params = encodeFilters({ ...DEFAULT_FILTERS, collections: [], products: [] });
    expect(params.get('col')).toBeNull();
    expect(params.get('prd')).toBeNull();
  });
  it('omits widgets param when same as default', () => {
    const params = encodeFilters({ ...DEFAULT_FILTERS });
    expect(params.get('w')).toBeNull();
  });
  it('encodes widgets when changed', () => {
    const params = encodeFilters({ ...DEFAULT_FILTERS, widgets: ['kpi-revenue'] });
    expect(params.get('w')).toBe('kpi-revenue');
  });
});

describe('roundtrip', () => {
  it('encode then decode returns same filters', () => {
    const original: AnalyticsFilters = {
      preset: 'custom',
      start: '2026-01-01',
      end: '2026-01-15',
      granularity: 'week',
      compare: false,
      collections: ['c1', 'c2'],
      products: [],
      statuses: ['pending', 'shipped'],
      paymentStatuses: ['paid'],
      widgets: ['kpi-revenue', 'revenue-chart'],
    };
    const params = encodeFilters(original);
    const decoded = decodeFilters(params);
    expect(decoded).toEqual(original);
  });
});

describe('isWidgetVisible', () => {
  it('returns true when widget is in list', () => {
    const f = { ...DEFAULT_FILTERS, widgets: ['kpi-revenue'] };
    expect(isWidgetVisible(f, 'kpi-revenue')).toBe(true);
  });
  it('returns false when widget is not in list', () => {
    const f = { ...DEFAULT_FILTERS, widgets: [] };
    expect(isWidgetVisible(f, 'kpi-revenue')).toBe(false);
  });
});

describe('toggleWidget', () => {
  it('adds when missing', () => {
    const f = toggleWidget({ ...DEFAULT_FILTERS, widgets: [] }, 'kpi-revenue');
    expect(f.widgets).toContain('kpi-revenue');
  });
  it('removes when present', () => {
    const f = toggleWidget({ ...DEFAULT_FILTERS, widgets: ['kpi-revenue'] }, 'kpi-revenue');
    expect(f.widgets).not.toContain('kpi-revenue');
  });
});

describe('reorderWidgets', () => {
  it('replaces order', () => {
    const f = reorderWidgets(DEFAULT_FILTERS, ['kpi-orders', 'kpi-revenue']);
    expect(f.widgets).toEqual(['kpi-orders', 'kpi-revenue']);
  });
});
