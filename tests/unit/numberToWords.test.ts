import { describe, expect, it } from 'vitest';
import { capitalize, numberToWords } from '@/lib/numberToWords';

describe('numberToWords', () => {
  it('spells out small counts', () => {
    expect(numberToWords(3)).toBe('three');
    expect(numberToWords(8)).toBe('eight');
  });

  it('handles teens and hyphenated tens', () => {
    expect(numberToWords(11)).toBe('eleven');
    expect(numberToWords(21)).toBe('twenty-one');
    expect(numberToWords(40)).toBe('forty');
  });

  it('falls back to digits beyond ninety-nine', () => {
    expect(numberToWords(115)).toBe('115');
  });

  it('degrades safely on nonsense input', () => {
    expect(numberToWords(0)).toBe('zero');
    expect(numberToWords(-5)).toBe('-5');
    expect(numberToWords(NaN)).toBe('NaN');
  });
});

describe('capitalize', () => {
  it('uppercases only the first letter', () => {
    expect(capitalize('three')).toBe('Three');
    expect(capitalize('twenty-one')).toBe('Twenty-one');
  });
});
