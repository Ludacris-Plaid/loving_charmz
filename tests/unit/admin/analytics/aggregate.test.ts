import { describe, it, expect } from 'vitest';
import {
  resolveDateRange,
  getBucketKey,
  getBucketLabel,
  generateBucketKeys,
  buildSeries,
  buildSparkline,
  computeDelta,
} from '@/lib/admin/analytics/aggregate';

describe('resolveDateRange', () => {
  it('7d preset is 7 days inclusive of today', () => {
    const r = resolveDateRange('7d');
    expect(r.preset).toBe('7d');
    expect(r.days).toBe(7);
    const diffMs = r.end.getTime() - r.start.getTime();
    expect(diffMs).toBeLessThanOrEqual(7 * 86400000);
    expect(diffMs).toBeGreaterThan(6 * 86400000);
  });

  it('30d preset', () => {
    const r = resolveDateRange('30d');
    expect(r.days).toBe(30);
  });

  it('ytd preset starts Jan 1 of current year', () => {
    const r = resolveDateRange('ytd');
    expect(r.start.getMonth()).toBe(0);
    expect(r.start.getDate()).toBe(1);
  });

  it('custom preset uses provided dates', () => {
    const r = resolveDateRange('custom', '2026-01-01', '2026-01-15');
    expect(r.preset).toBe('custom');
    expect(r.days).toBe(15);
    expect(r.start.getFullYear()).toBe(2026);
  });

  it('previous period is the same length immediately preceding', () => {
    const r = resolveDateRange('7d');
    const span = r.end.getTime() - r.start.getTime();
    const prevSpan = r.previous.end.getTime() - r.previous.start.getTime();
    expect(prevSpan).toBe(span);
    expect(r.previous.end.getTime()).toBeLessThan(r.start.getTime() + 86400000);
  });
});

describe('getBucketKey', () => {
  it('day granularity is yyyy-MM-dd', () => {
    expect(getBucketKey('2026-03-15T14:30:00.000Z', 'day')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  it('week granularity is start of week', () => {
    const k = getBucketKey('2026-03-15T14:30:00.000Z', 'week');
    expect(k).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  it('month granularity is yyyy-MM', () => {
    expect(getBucketKey('2026-03-15T14:30:00.000Z', 'month')).toMatch(/^\d{4}-\d{2}$/);
  });
});

describe('getBucketLabel', () => {
  it('formats day as MMM d', () => {
    expect(getBucketLabel('2026-03-15', 'day')).toBe('Mar 15');
  });
  it('formats month as MMM yyyy', () => {
    expect(getBucketLabel('2026-03', 'month')).toBe('Mar 2026');
  });
});

describe('generateBucketKeys', () => {
  it('produces correct number of buckets for 7d', () => {
    const r = resolveDateRange('7d');
    const keys = generateBucketKeys(r, 'day');
    expect(keys.length).toBe(7);
  });
  it('produces correct number of buckets for 90d', () => {
    const r = resolveDateRange('90d');
    const keys = generateBucketKeys(r, 'day');
    expect(keys.length).toBe(90);
  });
});

describe('buildSeries', () => {
  it('sums values across buckets', () => {
    const r = resolveDateRange('7d');
    const series = buildSeries(
      [
        { bucket: getBucketKey(r.start.toISOString(), 'day'), value: 10 },
        { bucket: getBucketKey(r.end.toISOString(), 'day'), value: 20 },
      ],
      r,
      'day',
    );
    expect(series.total).toBe(30);
    expect(series.points.length).toBe(7);
  });

  it('fills missing buckets with 0', () => {
    const r = resolveDateRange('7d');
    const series = buildSeries([], r, 'day');
    expect(series.points.every((p) => p.value === 0)).toBe(true);
  });

  it('includes previous values when requested', () => {
    const r = resolveDateRange('7d');
    const series = buildSeries(
      [{ bucket: getBucketKey(r.start.toISOString(), 'day'), value: 5 }],
      r,
      'day',
      { includePrevious: true, previousRows: [{ bucket: getBucketKey(r.start.toISOString(), 'day'), value: 2 }] },
    );
    expect(series.points[0].value).toBe(5);
    expect(series.points[0].previousValue).toBe(2);
  });
});

describe('buildSparkline', () => {
  it('returns valid SVG path', () => {
    const path = buildSparkline([1, 2, 3, 4, 5], 80, 24);
    expect(path.startsWith('M ')).toBe(true);
    expect(path.split(' L ').length).toBe(5);
  });
  it('handles empty array', () => {
    expect(buildSparkline([])).toBe('');
  });
  it('handles all-equal values', () => {
    const path = buildSparkline([5, 5, 5, 5], 80, 24);
    expect(path).toBeTruthy();
  });
});

describe('computeDelta', () => {
  it('positive direction when current > previous', () => {
    const d = computeDelta(150, 100);
    expect(d.delta).toBe(50);
    expect(d.deltaPct).toBe(50);
    expect(d.direction).toBe('up');
  });
  it('negative direction when current < previous', () => {
    const d = computeDelta(50, 100);
    expect(d.delta).toBe(-50);
    expect(d.deltaPct).toBe(-50);
    expect(d.direction).toBe('down');
  });
  it('flat when equal', () => {
    const d = computeDelta(100, 100);
    expect(d.delta).toBe(0);
    expect(d.deltaPct).toBe(0);
    expect(d.direction).toBe('flat');
  });
  it('null pct when previous is 0 and current is non-zero', () => {
    const d = computeDelta(100, 0);
    expect(d.deltaPct).toBeNull();
  });
  it('zero pct when both are 0', () => {
    const d = computeDelta(0, 0);
    expect(d.deltaPct).toBe(0);
  });
});
