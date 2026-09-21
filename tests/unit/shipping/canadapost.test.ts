import { describe, expect, it } from 'vitest';

import {
  buildNcShipmentXml,
  escXml,
  parseLinks,
  parseTrackingSummary,
  type CpShipmentInput,
} from '@/lib/shipping/canadapost';

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

describe('Canada Post XML builders', () => {
  it('escapes XML-special characters in addresses', () => {
    expect(escXml("O'Brien & Sons <Ltd>")).toBe("O&apos;Brien &amp; Sons &lt;Ltd&gt;");
  });

  it('builds a non-contract shipment with service, addresses, and parcel', () => {
    const xml = buildNcShipmentXml(sampleInput);
    expect(xml).toContain('<service-code>DOM.EP</service-code>');
    expect(xml).toContain('<company>Loving Charmz</company>');
    expect(xml).toContain('<postal-zip-code>T2T1N6</postal-zip-code>');
    expect(xml).toContain('<name>Jane Buyer</name>');
    expect(xml).toContain('<postal-zip-code>M5H2N2</postal-zip-code>');
    expect(xml).toContain('<weight>0.250</weight>');
    expect(xml).toContain('<length>10.0</length>');
  });

  it('normalizes postal codes by removing spaces', () => {
    const xml = buildNcShipmentXml(sampleInput);
    expect(xml).not.toContain('T2T 1N6');
    expect(xml).toContain('T2T1N6');
  });

  it('adds customer reference and tracking notifications when provided', () => {
    const xml = buildNcShipmentXml(sampleInput);
    expect(xml).toContain('<customer-ref-1>1ADBF06C</customer-ref-1>');
    expect(xml).toContain('<email>jane@example.com</email>');
    expect(xml).toContain('<on-delivery>true</on-delivery>');
  });

  it('adds customs for US/international services and omits them domestically', () => {
    const intl = buildNcShipmentXml({ ...sampleInput, serviceCode: 'USA.TP' });
    expect(intl).toContain('<customs>');
    expect(intl).toContain('<reason-for-export>SOG</reason-for-export>');

    const dom = buildNcShipmentXml(sampleInput);
    expect(dom).not.toContain('<customs>');
  });

  it('omits optional blocks when not provided', () => {
    const xml = buildNcShipmentXml({
      ...sampleInput,
      email: undefined,
      reference: undefined,
      parcel: { weightKg: 0.4 },
    });
    expect(xml).not.toContain('<customer-ref-1>');
    expect(xml).not.toContain('<notification>');
    expect(xml).not.toContain('<dimensions>');
    expect(xml).toContain('<weight>0.400</weight>');
  });
});

describe('Canada Post response parsing', () => {
  it('extracts link rel/href pairs', () => {
    const xml = `<?xml version="1.0"?>
<non-contract-shipment xmlns="http://www.canadapost.ca/ws/ncshipment-v4">
<link rel="self" href="https://ct.soa-gw.canadapost.ca/rs/0000000000/ncshipment/12345" media-type="application/vnd.cpc.ncshipment-v4+xml"/>
<link rel="label" href="https://ct.soa-gw.canadapost.ca/rs/0000000000/12345/label/0" media-type="application/pdf"/>
</non-contract-shipment>`;
    const links = parseLinks(xml);
    expect(links.self).toContain('/ncshipment/12345');
    expect(links.label).toContain('/label/0');
  });

  it('parses a tracking summary with events', () => {
    const xml = `<?xml version="1.0" encoding="utf-8"?>
<tracking-summary xmlns="http://www.canadapost.ca/ws/track-v2">
<pin-summary>
<pin>123456789012</pin>
<expected-delivery-date>2026-09-24</expected-delivery-date>
<event>
<event-date>2026-09-21</event-date>
<event-time>09:12:44</event-time>
<event-description>Item information at origin facility</event-description>
<event-site>CALGARY AB</event-site>
</event>
<event>
<event-date>2026-09-20</event-date>
<event-time>18:03:00</event-time>
<event-description>Electronic information submitted</event-description>
<event-site/>
</event>
</pin-summary>
</tracking-summary>`;
    const summary = parseTrackingSummary(xml);
    expect(summary.pin).toBe('123456789012');
    expect(summary.expectedDelivery).toBe('2026-09-24');
    expect(summary.eventName).toBe('Item information at origin facility');
    expect(summary.events).toHaveLength(2);
    expect(summary.events[1].description).toBe('Electronic information submitted');
    expect(summary.events[0].site).toBe('CALGARY AB');
  });
});

describe('credential gating', () => {
  it('reports unconfigured when env vars are absent', async () => {
    const { isCanadaPostConfigured } = await import('@/lib/shipping/canadapost');
    const savedKey = process.env.CP_API_KEY;
    const savedCustomer = process.env.CP_CUSTOMER_NUMBER;
    delete process.env.CP_API_KEY;
    delete process.env.CP_CUSTOMER_NUMBER;
    try {
      expect(isCanadaPostConfigured()).toBe(false);
    } finally {
      if (savedKey) process.env.CP_API_KEY = savedKey;
      if (savedCustomer) process.env.CP_CUSTOMER_NUMBER = savedCustomer;
    }
  });
});
