import { describe, expect, it } from 'vitest';

import {
  buildShipmentRequest,
  isDomesticService,
  normalizePostal,
  parseLinks,
  parseTrackingSummary,
  type CpShipmentInput,
} from '@/lib/shipping/canadapost';
import { buildRateRequest, parsePriceQuotes } from '@/lib/shipping/rates';

const sampleInput: CpShipmentInput = {
  serviceCode: 'DOM.EP',
  sender: {
    company: 'Loving Charmz',
    phone: '5555555555',
    addressLine1: '1 Main St',
    city: 'Calgary',
    province: 'AB',
    postalCode: 'T2T 1N6',
    countryCode: 'CA',
  },
  destination: {
    name: 'Jane Buyer',
    addressLine1: '99 Queen St W',
    city: 'Toronto',
    province: 'ON',
    postalCode: 'M5H 2N2',
    countryCode: 'CA',
  },
  parcel: { weightKg: 0.25, lengthCm: 10, widthCm: 8, heightCm: 4 },
  email: 'jane@example.com',
  reference: '1ADBF06C',
};

describe('shipment request building (shipping/v1 JSON)', () => {
  it('builds a non-contract shipment with service, addresses, and parcel', () => {
    const body = buildShipmentRequest(sampleInput, { mode: 'non-contract' }) as Record<string, any>;
    const spec = body.deliverySpec;

    expect(spec.serviceCode).toBe('DOM.EP');
    expect(spec.sender.company).toBe('Loving Charmz');
    expect(spec.sender.addressDetails.postalZipCode).toBe('T2T1N6');
    expect(spec.destination.name).toBe('Jane Buyer');
    expect(spec.destination.addressDetails.postalZipCode).toBe('M5H2N2');
    expect(spec.parcelCharacteristics.weight).toBe(0.25);
    expect(spec.parcelCharacteristics.dimensions).toEqual({ length: 10, width: 8, height: 4 });
    // Non-contract labels settle immediately — no manifest follows.
    expect(body.transmitShipment).toBe(true);
    expect(body.groupId).toBeUndefined();
  });

  it('normalizes postal codes by removing spaces and uppercasing', () => {
    expect(normalizePostal(' m5h 2n2 ', 'CA')).toBe('M5H2N2');
    const body = buildShipmentRequest(sampleInput, { mode: 'non-contract' }) as Record<string, any>;
    expect(JSON.stringify(body)).not.toContain('M5H 2N2');
  });

  it('defaults parcel dimensions to the charm mailer when absent (CP error 9162 guard)', () => {
    const { parcel: _parcel, ...withoutDims } = sampleInput;
    const body = buildShipmentRequest(
      { ...withoutDims, parcel: { weightKg: 0.25 } } as typeof sampleInput,
      { mode: 'non-contract' },
    ) as Record<string, any>;
    expect(body.deliverySpec.parcelCharacteristics.dimensions).toEqual({
      length: 20,
      width: 15,
      height: 3,
    });
  });

  it('adds customer reference and CP delivery notifications when provided', () => {
    const body = buildShipmentRequest(sampleInput, { mode: 'non-contract' }) as Record<string, any>;
    expect(body.deliverySpec.references.customerRef1).toBe('1ADBF06C');
    expect(body.deliverySpec.notification).toMatchObject({
      email: 'jane@example.com',
      onShipment: true,
      onException: true,
      onDelivery: true,
    });
  });

  it('adds customs for US/international services and omits them domestically', () => {
    const intl = buildShipmentRequest({ ...sampleInput, serviceCode: 'USA.TP' }, { mode: 'non-contract' }) as Record<string, any>;
    expect(intl.deliverySpec.customs).toMatchObject({ currency: 'CAD', reasonForExport: 'SOG' });
    // International destinations carry a phone number for the carrier.
    expect(isDomesticService('USA.TP')).toBe(false);

    const dom = buildShipmentRequest(sampleInput, { mode: 'non-contract' }) as Record<string, any>;
    expect(dom.deliverySpec.customs).toBeUndefined();
  });

  it('omits optional blocks when not provided (dimensions fall back — CP mandates them)', () => {
    const body = buildShipmentRequest(
      { ...sampleInput, email: undefined, reference: undefined, parcel: { weightKg: 0.4 } },
      { mode: 'non-contract' },
    ) as Record<string, any>;
    expect(body.deliverySpec.references).toBeUndefined();
    expect(body.deliverySpec.notification).toBeUndefined();
    // Dimensions are mandatory for parcel shipments (error 9162), so a
    // weight-only parcel gets the default bubble-mailer size.
    expect(body.deliverySpec.parcelCharacteristics.dimensions).toEqual({
      length: 20,
      width: 15,
      height: 3,
    });
    expect(body.deliverySpec.parcelCharacteristics.weight).toBe(0.4);
  });

  it('contract mode groups shipments instead of transmitting immediately', () => {
    const body = buildShipmentRequest(sampleInput, {
      mode: 'contract',
      groupId: 'lc-20260921',
    }) as Record<string, any>;
    expect(body.groupId).toBe('lc-20260921');
    expect(body.transmitShipment).toBeUndefined();
    expect(body.deliverySpec.settlementInfo.intendedMethodOfPayment).toBe('Account');
  });
});

describe('response parsing', () => {
  it('flattens the links array into rel → href', () => {
    const links = parseLinks([
      { rel: 'self', href: 'https://api.canadapost-postescanada.ca/x/shipments/1', mediaType: 'application/json' },
      { rel: 'label', href: 'https://api.canadapost-postescanada.ca/x/shipments/1/label/0', mediaType: 'application/pdf' },
    ]);
    expect(links.self).toContain('/shipments/1');
    expect(links.label).toContain('/label/0');
    expect(parseLinks(undefined)).toEqual({});
  });

  it('parses a tracking summary array with the latest event first', () => {
    const summary = parseTrackingSummary([
      {
        pin: '123456789012',
        serviceName: 'Xpresspost',
        expectedDeliveryDate: '2026-09-24',
        eventDescription: 'Item information at origin facility',
        eventDate: '2026-09-21',
        eventTime: '09:12:44',
        eventLocation: 'CALGARY AB',
      },
      {
        eventDescription: 'Electronic information submitted',
        eventDate: '2026-09-20',
        eventTime: '18:03:00',
      },
    ]);
    expect(summary.pin).toBe('123456789012');
    expect(summary.expectedDelivery).toBe('2026-09-24');
    expect(summary.eventName).toBe('Item information at origin facility');
    expect(summary.serviceName).toBe('Xpresspost');
    expect(summary.events).toHaveLength(2);
    expect(summary.events[0].site).toBe('CALGARY AB');
    expect(summary.events[1].description).toBe('Electronic information submitted');
  });

  it('survives a per-PIN error entry (200 with error object)', () => {
    const summary = parseTrackingSummary([
      { pin: '123456789012', error: { code: '004', descEn: 'No PIN History' } },
    ]);
    expect(summary.pin).toBe('123456789012');
    expect(summary.eventName).toBeNull();
  });
});

describe('rating request building (rating/v1 JSON)', () => {
  it('builds a domestic scenario with quote type and services', () => {
    const body = buildRateRequest({
      quoteType: 'counter',
      originPostal: 't2t 1n6',
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

describe('rating response parsing', () => {
  it('parses every price quote with due, eta, and guarantee', () => {
    const quotes = parsePriceQuotes([
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
    ]);
    expect(quotes).toHaveLength(2);
    expect(quotes[0]).toMatchObject({
      serviceCode: 'DOM.RP',
      serviceName: 'Regular Parcel',
      due: 13.57,
      transitDays: 4,
      expectedDeliveryDate: '2026-09-25',
      guaranteed: false,
    });
    expect(quotes[1]).toMatchObject({ serviceCode: 'DOM.XP', due: 21.06, guaranteed: true });
  });

  it('returns no quotes for null payload and skips quotes missing due', () => {
    expect(parsePriceQuotes(null)).toEqual([]);
    const partial = parsePriceQuotes([
      { serviceCode: 'DOM.RP', serviceName: 'Regular Parcel', priceDetails: { base: 9.99 } },
      { serviceCode: 'DOM.EP', serviceName: 'Expedited', priceDetails: { due: 12.34 } },
    ]);
    expect(partial).toHaveLength(1);
    expect(partial[0].serviceCode).toBe('DOM.EP');
  });
});

describe('credential gating', () => {
  it('reports unconfigured when env vars are absent', async () => {
    const { isCanadaPostConfigured, getCpConfig } = await import('@/lib/shipping/canadapost');
    const saved: Record<string, string | undefined> = {};
    for (const k of ['CP_API_KEY', 'CP_RATING_KEY', 'CP_SHIPPING_KEY', 'CP_TRACKING_KEY', 'CP_CUSTOMER_NUMBER']) {
      saved[k] = process.env[k];
      delete process.env[k];
    }
    try {
      expect(isCanadaPostConfigured()).toBe(false);
      expect(getCpConfig()).toBeNull();
    } finally {
      for (const [k, v] of Object.entries(saved)) {
        if (v !== undefined) process.env[k] = v;
      }
    }
  });

  it('falls back across families so one subscribed pair can cover another', async () => {
    const { getCpConfig } = await import('@/lib/shipping/canadapost');
    const saved: Record<string, string | undefined> = {};
    for (const k of ['CP_API_KEY', 'CP_RATING_KEY', 'CP_SHIPPING_KEY', 'CP_TRACKING_KEY', 'CP_CUSTOMER_NUMBER']) {
      saved[k] = process.env[k];
    }
    process.env.CP_CUSTOMER_NUMBER = '0001306247';
    process.env.CP_SHIPPING_KEY = 'shipkey:shipsecret';
    delete process.env.CP_RATING_KEY;
    delete process.env.CP_TRACKING_KEY;
    try {
      const cfg = getCpConfig()!;
      expect(cfg.shippingPair).toBe('shipkey:shipsecret');
      // Same-account fallback: family without its own pair borrows another.
      expect(cfg.trackingPair).toBe('shipkey:shipsecret');
      expect(cfg.ratingPair).toBe('shipkey:shipsecret');
    } finally {
      for (const [k, v] of Object.entries(saved)) {
        if (v !== undefined) process.env[k] = v;
        else delete process.env[k];
      }
    }
  });
});
