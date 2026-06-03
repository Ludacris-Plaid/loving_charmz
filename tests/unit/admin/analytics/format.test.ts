import { describe, it, expect } from 'vitest';
import {
  formatMoney,
  formatNumber,
  formatPct,
  formatDelta,
  formatDays,
  formatRelative,
} from '@/lib/admin/analytics/format';

describe('formatMoney', () => {
  it('default 2 decimals', () => {
    expect(formatMoney(1234.5)).toBe('$1,234.50');
  });
  it('0 decimals when requested', () => {
    expect(formatMoney(1234.5, { decimals: 0 })).toBe('$1,235');
  });
  it('compact K', () => {
    expect(formatMoney(12345, { compact: true })).toBe('$12.3K');
  });
  it('compact M', () => {
    expect(formatMoney(2_500_000, { compact: true })).toBe('$2.5M');
  });
  it('handles zero', () => {
    expect(formatMoney(0)).toBe('$0.00');
  });
  it('handles negative', () => {
    expect(formatMoney(-100)).toBe('-$100.00');
  });
});

describe('formatNumber', () => {
  it('thousands separator', () => {
    expect(formatNumber(12345)).toBe('12,345');
  });
  it('compact K', () => {
    expect(formatNumber(12345, { compact: true })).toBe('12.3K');
  });
});

describe('formatPct', () => {
  it('one decimal by default', () => {
    expect(formatPct(45.678)).toBe('45.7%');
  });
  it('em-dash for null', () => {
    expect(formatPct(null)).toBe('—');
  });
  it('em-dash for NaN', () => {
    expect(formatPct(NaN)).toBe('—');
  });
});

describe('formatDelta', () => {
  it('adds + for positive', () => {
    expect(formatDelta(12.5)).toBe('+12.5%');
  });
  it('negative number', () => {
    expect(formatDelta(-5.2)).toBe('-5.2%');
  });
  it('null becomes em-dash', () => {
    expect(formatDelta(null)).toBe('—');
  });
});

describe('formatDays', () => {
  it('one decimal', () => {
    expect(formatDays(3.45)).toBe('3.5d');
  });
  it('null em-dash', () => {
    expect(formatDays(null)).toBe('—');
  });
});

describe('formatRelative', () => {
  it('just now', () => {
    expect(formatRelative(new Date().toISOString())).toBe('just now');
  });
  it('minutes', () => {
    const d = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(formatRelative(d)).toBe('5m ago');
  });
  it('hours', () => {
    const d = new Date(Date.now() - 3 * 3600 * 1000).toISOString();
    expect(formatRelative(d)).toBe('3h ago');
  });
  it('days', () => {
    const d = new Date(Date.now() - 2 * 86400 * 1000).toISOString();
    expect(formatRelative(d)).toBe('2d ago');
  });
  it('months', () => {
    const d = new Date(Date.now() - 60 * 86400 * 1000).toISOString();
    expect(formatRelative(d)).toBe('2mo ago');
  });
});
