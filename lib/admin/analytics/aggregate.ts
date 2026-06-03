import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subDays,
  subWeeks,
  subMonths,
  format,
  parseISO,
  differenceInDays,
  differenceInCalendarDays,
  isAfter,
  isBefore,
  isEqual,
  addDays,
  addWeeks,
  addMonths,
} from 'date-fns';
import type {
  DateRangePreset,
  Granularity,
  ResolvedDateRange,
  Series,
  SeriesPoint,
  KpiDelta,
} from './types';

export function resolveDateRange(preset: DateRangePreset, customStart?: string, customEnd?: string): ResolvedDateRange {
  const end = endOfDay(new Date());
  let start: Date;
  let days: number;

  switch (preset) {
    case '7d':
      start = startOfDay(subDays(end, 6));
      days = 7;
      break;
    case '30d':
      start = startOfDay(subDays(end, 29));
      days = 30;
      break;
    case '90d':
      start = startOfDay(subDays(end, 89));
      days = 90;
      break;
    case 'ytd':
      start = startOfDay(new Date(end.getFullYear(), 0, 1));
      days = differenceInDays(end, start) + 1;
      break;
    case 'custom':
      if (customStart && customEnd) {
        start = startOfDay(parseISO(customStart));
        const endCustom = endOfDay(parseISO(customEnd));
        days = differenceInDays(endCustom, start) + 1;
        return {
          start,
          end: endCustom,
          preset,
          days,
          previous: { start: subDays(start, days), end: subDays(endCustom, days) },
        };
      }
      start = startOfDay(subDays(end, 29));
      days = 30;
      break;
  }

  return {
    start,
    end,
    preset,
    days,
    previous: { start: subDays(start, days), end: subDays(end, days) },
  };
}

export function getBucketKey(date: Date | string, granularity: Granularity): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  switch (granularity) {
    case 'day':
      return format(d, 'yyyy-MM-dd');
    case 'week':
      return format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    case 'month':
      return format(startOfMonth(d), 'yyyy-MM');
  }
}

export function getBucketLabel(bucketKey: string, granularity: Granularity): string {
  const d = parseISO(granularity === 'month' ? `${bucketKey}-01` : bucketKey);
  switch (granularity) {
    case 'day':
      return format(d, 'MMM d');
    case 'week':
      return format(d, "MMM d");
    case 'month':
      return format(d, 'MMM yyyy');
  }
}

export function getBucketStart(bucketKey: string, granularity: Granularity): Date {
  switch (granularity) {
    case 'day':
      return startOfDay(parseISO(bucketKey));
    case 'week':
      return startOfWeek(parseISO(bucketKey), { weekStartsOn: 1 });
    case 'month':
      return startOfMonth(parseISO(`${bucketKey}-01`));
  }
}

export function getBucketEnd(bucketKey: string, granularity: Granularity): Date {
  switch (granularity) {
    case 'day':
      return endOfDay(parseISO(bucketKey));
    case 'week':
      return endOfWeek(parseISO(bucketKey), { weekStartsOn: 1 });
    case 'month':
      return endOfMonth(parseISO(`${bucketKey}-01`));
  }
}

export function getNextBucketStart(bucketKey: string, granularity: Granularity): Date {
  const start = getBucketStart(bucketKey, granularity);
  switch (granularity) {
    case 'day':
      return addDays(start, 1);
    case 'week':
      return addWeeks(start, 1);
    case 'month':
      return addMonths(start, 1);
  }
}

export function generateBucketKeys(range: ResolvedDateRange, granularity: Granularity): string[] {
  const keys: string[] = [];
  let cursor = getBucketStart(getBucketKey(range.start, granularity), granularity);
  const stop = range.end;
  while (isBefore(cursor, stop) || isEqual(cursor, stop)) {
    keys.push(getBucketKey(cursor, granularity));
    cursor = getNextBucketStart(getBucketKey(cursor, granularity), granularity);
    if (keys.length > 366) break;
  }
  return keys;
}

export type BucketRow = { bucket: string; value: number };

export function buildSeries(
  rows: BucketRow[],
  range: ResolvedDateRange,
  granularity: Granularity,
  options: { includePrevious?: boolean; previousRows?: BucketRow[] } = {},
): Series {
  const keys = generateBucketKeys(range, granularity);
  const map = new Map(rows.map((r) => [r.bucket, r.value]));
  const prevMap = new Map((options.previousRows || []).map((r) => [r.bucket, r.value]));
  const points: SeriesPoint[] = keys.map((k) => ({
    date: k,
    value: map.get(k) ?? 0,
    previousValue: options.includePrevious ? prevMap.get(k) ?? 0 : undefined,
  }));
  const total = points.reduce((sum, p) => sum + p.value, 0);
  return {
    id: '',
    label: '',
    color: '',
    points,
    total,
  };
}

export function buildSparkline(values: number[], width = 80, height = 24): string {
  if (values.length === 0) return '';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = values.length > 1 ? width / (values.length - 1) : width;
  return values
    .map((v, i) => {
      const x = i * stepX;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

export function computeDelta(current: number, previous: number): KpiDelta {
  const delta = current - previous;
  const deltaPct = previous === 0 ? (current === 0 ? 0 : null) : (delta / previous) * 100;
  let direction: 'up' | 'down' | 'flat' = 'flat';
  if (delta > 0) direction = 'up';
  else if (delta < 0) direction = 'down';
  return { current, previous, delta, deltaPct, direction };
}

export function previousBucketKey(bucketKey: string, granularity: Granularity): string {
  const start = getBucketStart(bucketKey, granularity);
  const days = differenceInCalendarDays(rangeSize(granularity), new Date(0));
  void days;
  switch (granularity) {
    case 'day':
      return getBucketKey(subDays(start, 1), granularity);
    case 'week':
      return getBucketKey(subWeeks(start, 1), granularity);
    case 'month':
      return getBucketKey(subMonths(start, 1), granularity);
  }
}

function rangeSize(granularity: Granularity): Date {
  switch (granularity) {
    case 'day':
      return addDays(new Date(0), 1);
    case 'week':
      return addWeeks(new Date(0), 1);
    case 'month':
      return addMonths(new Date(0), 1);
  }
}

export function inRange(iso: string | null | undefined, start: Date, end: Date): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return t >= start.getTime() && t <= end.getTime();
}

export function isAfterDate(iso: string, date: Date): boolean {
  return isAfter(new Date(iso), date);
}

export function isBeforeDate(iso: string, date: Date): boolean {
  return isBefore(new Date(iso), date);
}
