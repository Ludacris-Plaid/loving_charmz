import { describe, expect, it } from 'vitest';

import { buildRateRequestXml, parsePriceQuotes } from '@/lib/shipping/rates';
import { computeOrderTotals, FLAT_SHIPPING_RATE, FREE_SHIPPING_THRESHOLD } from '@/lib/checkout/pricing';

const SAMPLE_RESPONSE = `<?xml version="1.0" encoding="utf-8"?>
<price-quotes xmlns="http://www.canadapost.ca/ws/ship/rate-v4">
<price-quote>
<service-code>DOM.RP</service-code>
<service-name>Regular Parcel</service-name>
<price-details>
<base>9.99</base>
<taxes><gst vat="0.05">0.5</gst></taxes>
<due>13.57</due>
</price-details>
<service-standard>
<guaranteed-delivery>false</guaranteed-delivery>
<expected-transit-time>4</expected-transit-time>
<expected-delivery-date>2026-09-25</expected-delivery-date>
</service-standard>
</price-quote>
<price-quote>
<service-code>DOM.XP</service-code>
<service-name>Xpresspost</service-name>
<price-details>
<base>16.5</base>
<taxes><hst vat="0.05">0.83</hst></taxes>
<due>21.06</due>
</price-details>
<service-standard>
<guaranteed-delivery>true</guaranteed-delivery>
<expected-transit-time>2</expected-transit-time>
<expected-delivery-date>2026-09-23</expected-delivery-date>
</service-standard>
</price-quote>
</price-quotes>`;

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

  it('returns no quotes for an error message body', () => {
    const err = `<messages><message><code>9111</code><description>No services are appropriate.</description></message></messages>`;
    expect(parsePriceQuotes(err)).toEqual([]);
  });

  it('skips quote blocks missing due amounts', () => {
    const partial = `<price-quotes>
<price-quote><service-code>DOM.RP</service-code><service-name>Regular Parcel</service-name><price-details><base>9.99</base></price-details></price-quote>
<price-quote><service-code>DOM.EP</service-code><service-name>Expedited</service-name><price-details><due>12.34</due></price-details></price-quote>
</price-quotes>`;
    const quotes = parsePriceQuotes(partial);
    expect(quotes).toHaveLength(1);
    expect(quotes[0].serviceCode).toBe('DOM.EP');
  });
});

describe('Get Rates request building', () => {
  it('builds a domestic scenario with customer number and services', () => {
    const xml = buildRateRequestXml({
      customerNumber: '0000000000',
      originPostal: 'T2T1N6',
      destPostal: 'm5h 2n2',
      destCountry: 'CA',
      weightKg: 0.25,
      services: ['DOM.EP', 'DOM.RP'],
    });
    expect(xml).toContain('<customer-number>0000000000</customer-number>');
    expect(xml).toContain('<origin-postal-code>T2T1N6</origin-postal-code>');
    expect(xml).toContain('<postal-code>M5H2N2</postal-code>');
    expect(xml).toContain('<service-code>DOM.EP</service-code>');
    expect(xml).toContain('<weight>0.250</weight>');
    expect(xml).not.toContain('<united-states>');
  });

  it('builds a US scenario with zip-code destination and no customer number', () => {
    const xml = buildRateRequestXml({
      originPostal: 'T2T1N6',
      destPostal: '90210',
      destCountry: 'US',
      weightKg: 0.4,
    });
    expect(xml).toContain('<united-states><zip-code>90210</zip-code></united-states>');
    expect(xml).not.toContain('customer-number');
    expect(xml).not.toContain('<services>');
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

  it('free-over-threshold wins even when a live quote exists', () => {
    const bigCart = [{ unitPrice: FREE_SHIPPING_THRESHOLD + 10, quantity: 1 }];
    const t = computeOrderTotals(bigCart, null, undefined, 21.06);
    expect(t.shipping).toBe(0);
  });

  it('ignores invalid overrides and falls back to flat rate', () => {
    expect(computeOrderTotals(lines, null, undefined, NaN).shipping).toBe(FLAT_SHIPPING_RATE);
    expect(computeOrderTotals(lines, null, undefined, -5).shipping).toBe(FLAT_SHIPPING_RATE);
  });

  it('empty cart ships free regardless of override', () => {
    expect(computeOrderTotals([], null, undefined, 13.57).shipping).toBe(0);
  });
});
