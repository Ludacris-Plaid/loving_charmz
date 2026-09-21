import { describe, expect, it } from 'vitest';

import { isStandardShipping, SHIPPING_FLAT_ID } from '@/lib/shipping/quote-server';

describe('isStandardShipping (free-shipping eligibility)', () => {
  it('treats the flat rate as standard', () => {
    expect(isStandardShipping(SHIPPING_FLAT_ID)).toBe(true);
    expect(isStandardShipping('')).toBe(true);
  });

  it('treats Canada Post Regular Parcel as standard', () => {
    expect(isStandardShipping('DOM.RP')).toBe(true);
  });

  it('treats every express/priority service as expedited', () => {
    expect(isStandardShipping('DOM.XP')).toBe(false);
    expect(isStandardShipping('DOM.EP')).toBe(false);
    expect(isStandardShipping('DOM.PC')).toBe(false);
    expect(isStandardShipping('USA.TP')).toBe(false);
    expect(isStandardShipping('INT.XP')).toBe(false);
  });

  it('treats unknown service ids as expedited (fail closed)', () => {
    expect(isStandardShipping('FLAT-RATE-FAKE')).toBe(false);
  });
});
