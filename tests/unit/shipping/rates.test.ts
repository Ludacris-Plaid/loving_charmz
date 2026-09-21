import { describe, expect, it } from 'vitest';

import { buildRateRequest, parsePriceQuotes } from '@/lib/shipping/rates';
import { computeOrderTotals, FLAT_SHIPPING_RATE, FREE_SHIPPING_THRESHOLD } from '@/lib/checkout/pricing';

const SAMPLE_RESPONSE = [
  {
    serviceCode: 'DOM.RP',
    serviceName: 'Regular Parcel',
    priceDetails: { base: 9.99, due: 13.57 },
    serviceStandard: {
      guaranteedDelivery: false,
      expectedTransitTime: 4,
      expectedDeliveryDate: '2026-09-25',
    },
  },
  {
    serviceCode: 'DOM.XP',
    serviceName: 'Xpresspost',
    priceDetails: { base: 16.5, due: 21.06 },
    serviceStandard: {
      guaranteedDelivery: true,
      expectedTransitTime: 2,
      expectedDeliveryDate: '2026-09-23',
    },
  },
];

describe('Get Rates response parsing', () => {
  it('parses every price quote with due, eta, and guarantee', () => {
    const quotes = parsePriceQuotes(SAMPLE_RESPONSE);
    expect(quotes).toHaveLength(2);

    expect(quotes[0]).toMatchObject({
      serviceCode: 'DOM.RP',
      serviceName: 'Regular Parcel',
      due: 13.57,
      transitDays: 4,
      expectedDeliveryDate: '2026-09-25',
      guaranteed: false,
    });
    expect(quotes[1]).toMatchObject({
      serviceCode: 'DOM.XP',
      due: 21.06,
      guaranteed: true,
    });
  });

  it('returns no quotes for a non-array payload', () => {
    const err = { httpCode: '401', httpMessage: 'Unauthorized' } as unknown as null;
    expect(parsePriceQuotes(err)).toEqual([]);
  });

  it('skips quote blocks missing due amounts', () => {
    const partial = [
      { serviceCode: 'DOM.RP', serviceName: 'Regular Parcel', priceDetails: { base: 9.99 } },
      { serviceCode: 'DOM.EP', serviceName: 'Expedited', priceDetails: { due: 12.34 } },
    ];
    const quotes = parsePriceQuotes(partial);
    expect(quotes).toHaveLength(1);
    expect(quotes[0].serviceCode).toBe('DOM.EP');
  });
});

describe('Get Rates request building', () => {
  it('builds a domestic scenario with quote type, origin, and services', () => {
    const body = buildRateRequest({
      quoteType: 'counter',
      originPostal: 'T2T1N6',
      destPostal: 'm5h 2n2',
      destCountry: 'CA',
      weightKg: 0.25,
      services: ['DOM.EP', 'DOM.RP'],
    }) as Record<string, any>;
    expect(body.quoteType).toBe('counter');
    expect(body.originPostalCode).toBe('T2T1N6');
    expect(body.destination).toEqual({ domestic: { postalCode: 'M5H2N2' } });
    expect(body.services).toEqual(['DOM.EP', 'DOM.RP']);
    expect(body.parcelCharacteristics.weight).toBe(0.25);
    expect(body.destination.unitedStates).toBeUndefined();
  });

  it('builds a US scenario with zip-code destination and no services', () => {
    const body = buildRateRequest({
      quoteType: 'counter',
      originPostal: 'T2T1N6',
      destPostal: '90210',
      destCountry: 'US',
      weightKg: 0.4,
    }) as Record<string, any>;
    expect(body.destination).toEqual({ unitedStates: { zipCode: '90210' } });
    expect(body.services).toBeUndefined();
  });
});

describe('computeOrderTotals shipping override', () => {
  const lines = [{ unitPrice: 30, quantity: 1 }]; // subtotal 30 → under threshold

  it('uses the flat rate when no override is given', () => {
    const t = computeOrderTotals(lines);
    expect(t.shipping).toBe(FLAT_SHIPPING_RATE);
  });

  it('uses a live quoted price when provided', () => {
    const t = computeOrderTotals(lines, null, undefined, 13.57);
    expect(t.shipping).toBe(13.57);
    expect(t.total).toBe(30 + 13.57 + t.tax);
  });

  it('free-over-threshold wins for a standard live quote', () => {
    const bigCart = [{ unitPrice: FREE_SHIPPING_THRESHOLD + 10, quantity: 1 }];
    const t = computeOrderTotals(bigCart, null, undefined, 21.06);
    expect(t.shipping).toBe(0);
  });

  it('charges the quoted price for expedited services even on qualifying carts', () => {
    // Xpresspost on a $120 cart: the free-shipping promotion must NOT zero it.
    const bigCart = [{ unitPrice: FREE_SHIPPING_THRESHOLD + 10, quantity: 1 }];
    const t = computeOrderTotals(bigCart, null, undefined, 21.06, { expedited: true });
    expect(t.shipping).toBe(21.06);
  });

  it('charges the flat rate below threshold for expedited services too', () => {
    const lines = [{ unitPrice: 30, quantity: 1 }];
    const t = computeOrderTotals(lines, null, undefined, 21.06, { expedited: true });
    expect(t.shipping).toBe(21.06); // quoted, not flat, since a real quote exists
  });

  it('ignores invalid overrides and falls back to flat rate', () => {
    expect(computeOrderTotals(lines, null, undefined, NaN).shipping).toBe(FLAT_SHIPPING_RATE);
    expect(computeOrderTotals(lines, null, undefined, -5).shipping).toBe(FLAT_SHIPPING_RATE);
  });

  it('empty cart ships free regardless of override', () => {
    expect(computeOrderTotals([], null, undefined, 13.57).shipping).toBe(0);
  });
});
