import { describe, it, expect, vi, beforeEach } from 'vitest';
import { toCsv, timestampedFilename } from '@/lib/admin/analytics/csv';

describe('toCsv', () => {
  it('returns empty string for empty rows', () => {
    expect(toCsv([])).toBe('');
  });
  it('joins header + rows', () => {
    const csv = toCsv([
      { a: 1, b: 'x' },
      { a: 2, b: 'y' },
    ]);
    expect(csv).toBe('a,b\n1,x\n2,y');
  });
  it('escapes commas', () => {
    const csv = toCsv([{ name: 'Hello, world' }]);
    expect(csv).toBe('name\n"Hello, world"');
  });
  it('escapes quotes', () => {
    const csv = toCsv([{ name: 'She said "hi"' }]);
    expect(csv).toBe('name\n"She said ""hi"""');
  });
  it('escapes newlines', () => {
    const csv = toCsv([{ name: 'line1\nline2' }]);
    expect(csv).toBe('name\n"line1\nline2"');
  });
  it('handles null and undefined', () => {
    const csv = toCsv([{ a: null, b: undefined, c: 'ok' }]);
    expect(csv).toBe('a,b,c\n,,ok');
  });
  it('handles numbers and booleans', () => {
    const csv = toCsv([{ a: 42, b: true, c: false }]);
    expect(csv).toBe('a,b,c\n42,true,false');
  });
  it('collects union of keys', () => {
    const csv = toCsv([
      { a: 1, b: 2 },
      { a: 3, c: 4 },
    ]);
    const lines = csv.split('\n');
    expect(lines[0].split(',').sort()).toEqual(['a', 'b', 'c'].sort());
  });
});

describe('timestampedFilename', () => {
  it('uses default csv extension', () => {
    const name = timestampedFilename('report');
    expect(name).toMatch(/^report-\d{8}-\d{4}\.csv$/);
  });
  it('honors custom extension', () => {
    const name = timestampedFilename('data', 'json');
    expect(name.endsWith('.json')).toBe(true);
  });
});
