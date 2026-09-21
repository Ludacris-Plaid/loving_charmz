import { describe, expect, it } from 'vitest';

import {
  computeOrderTotals,
  formatMoney,
  lineUnitPrice,
  roundMoney,
  toMinorUnits,
} from '@/lib/checkout/pricing';

describe('computeOrderTotals', () => {
  it('charges flat shipping below the free threshold', () => {
    const totals = computeOrderTotals([{ unitPrice: 40, quantity: 1 }]);
    expect(totals.subtotal).toBe(40);
    expect(totals.shipping).toBe(9.99);
    expect(totals.tax).toBe(2.0);
    expect(totals.total).toBe(51.99);
    expect(totals.taxLabel).toBe('GST');
  });

  it('drops shipping above the threshold', () => {
    const totals = computeOrderTotals([{ unitPrice: 60, quantity: 2 }]);
    expect(totals.subtotal).toBe(120);
    expect(totals.shipping).toBe(0);
    expect(totals.tax).toBe(6.0);
    expect(totals.total).toBe(126.0);
    expect(totals.taxLabel).toBe('GST');
  });

  it('does not round-trip through floats', () => {
    // 0.1 * 3 lines is the classic binary float trap.
    const totals = computeOrderTotals([{ unitPrice: 0.1, quantity: 3 }]);
    expect(totals.subtotal).toBe(0.3);
  });

  it('charges nothing for an empty cart', () => {
    expect(computeOrderTotals([])).toEqual({ subtotal: 0, shipping: 0, tax: 0, discount: 0, total: 0, taxLabel: 'GST' });
  });

  it('uses province-aware tax rates', () => {
    const totalsAB = computeOrderTotals([{ unitPrice: 100, quantity: 1 }], null, { code: 'AB', name: 'Alberta', rate: 0.05, label: 'GST' });
    const totalsON = computeOrderTotals([{ unitPrice: 100, quantity: 1 }], null, { code: 'ON', name: 'Ontario', rate: 0.13, label: 'HST' });
    expect(totalsAB.tax).toBe(5.0);
    expect(totalsAB.taxLabel).toBe('GST');
    expect(totalsON.tax).toBe(13.0);
    expect(totalsON.taxLabel).toBe('HST');
  });
});

describe('money helpers', () => {
  it('formats provider amounts as decimal strings', () => {
    expect(formatMoney(69.385)).toBe('69.39');
    expect(formatMoney(120)).toBe('120.00');
  });

  it('converts to minor units for Square', () => {
    expect(toMinorUnits('69.39')).toBe(6939);
    expect(toMinorUnits(120)).toBe(12000);
  });

  it('rounds to cents instead of leaking float noise', () => {
    expect(roundMoney(0.1 + 0.2)).toBe(0.3);
    expect(roundMoney(12.3449)).toBe(12.34);
    expect(roundMoney(12.345)).toBe(12.35);
  });
});

describe('lineUnitPrice', () => {
  it('adds the variant adjustment, treating nulls as zero', () => {
    expect(lineUnitPrice({ base_price: '55.00', price_adjustment: '10.00' })).toBe(65);
    expect(lineUnitPrice({ base_price: 55, price_adjustment: null })).toBe(55);
  });
});
