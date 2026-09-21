import 'server-only';

import { CanadaPostError, escXml, getCpConfig } from './canadapost';

/**
 * Canada Post Get Rates (rate-v4) — live shipping quotes at checkout.
 *
 * POST {base}/rs/ship/price with a mailing-scenario document; returns one
 * quote per eligible service (price, taxes included, transit time, delivery
 * date). The "due" amount is the full landed cost (base + fuel surcharge +
 * taxes), which is what a shopper expects to see.
 *
 * Semantics shared with the rest of the CP client:
 *  - not configured  → { available: false } (checkout falls back to flat rate)
 *  - CP unreachable/empty → { available: true, quotes: [] } (same fallback)
 */

const RATE_V4 = 'application/vnd.cpc.ship.rate-v4+xml';

export type CpRateQuote = {
  serviceCode: string;
  serviceName: string;
  /** Total landed cost (base + adjustments + taxes) in CAD. */
  due: number;
  /** Expected delivery date (YYYY-MM-DD) when CP returns one. */
  expectedDeliveryDate: string | null;
  /** Business days to first delivery attempt when CP returns one. */
  transitDays: number | null;
  guaranteed: boolean;
};

export type CpRatesResult =
  | { available: false }
  | { available: true; quotes: CpRateQuote[] };

function textOf(xml: string, tag: string): string | null {
  const m = xml.match(new RegExp(`<[^>]*:?${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</[^>]*:?${tag}>`));
  return m ? m[1].trim() : null;
}

/** Parse every <price-quote> block into a usable quote. */
export function parsePriceQuotes(xml: string): CpRateQuote[] {
  const quotes: CpRateQuote[] = [];
  const re = /<price-quote>([\s\S]*?)<\/price-quote>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    const block = m[1];
    const code = textOf(block, 'service-code');
    const name = textOf(block, 'service-name');
    const dueRaw = textOf(block, 'due');
    if (!code || dueRaw === null) continue;
    const due = Number(dueRaw);
    if (!Number.isFinite(due) || due < 0) continue;
    quotes.push({
      serviceCode: code,
      serviceName: name || code,
      due: Math.round(due * 100) / 100,
      expectedDeliveryDate: textOf(block, 'expected-delivery-date'),
      transitDays: textOf(block, 'expected-transit-time')
        ? Number(textOf(block, 'expected-transit-time'))
        : null,
      guaranteed: textOf(block, 'guaranteed-delivery') === 'true',
    });
  }
  return quotes;
}

export function buildRateRequestXml(options: {
  customerNumber?: string;
  originPostal: string;
  destPostal: string;
  destCountry: 'CA' | 'US' | string;
  weightKg: number;
  services?: string[];
}): string {
  const { customerNumber, originPostal, destPostal, destCountry, weightKg, services } = options;
  const isCa = destCountry === 'CA';
  const isUs = destCountry === 'US';
  const destination = isCa
    ? `<domestic><postal-code>${escXml(destPostal.replace(/\s/g, '').toUpperCase())}</postal-code></domestic>`
    : isUs
      ? `<united-states><zip-code>${escXml(destPostal.replace(/\s/g, ''))}</zip-code></united-states>`
      : `<international><country-code>${escXml(destCountry)}</country-code></international>`;

  const serviceCodes = services?.length
    ? `<services>${services.map((s) => `<service-code>${escXml(s)}</service-code>`).join('')}</services>`
    : '';

  return `<?xml version="1.0" encoding="utf-8"?>
<mailing-scenario xmlns="http://www.canadapost.ca/ws/ship/rate-v4">
${customerNumber ? `<customer-number>${escXml(customerNumber)}</customer-number>` : ''}
<parcel-characteristics>
<weight>${weightKg.toFixed(3)}</weight>
</parcel-characteristics>
<origin-postal-code>${escXml(originPostal)}</origin-postal-code>
<destination>
${destination}
</destination>
${serviceCodes}
</mailing-scenario>`;
}

export async function getShippingRates(options: {
  destPostal: string;
  destCountry: 'CA' | 'US' | string;
  weightKg: number;
  services?: string[];
}): Promise<CpRatesResult> {
  const cfg = getCpConfig();
  if (!cfg?.originPostal) return { available: false };

  const xml = buildRateRequestXml({
    customerNumber: cfg.customerNumber,
    originPostal: cfg.originPostal,
    destPostal: options.destPostal,
    destCountry: options.destCountry,
    weightKg: Math.max(0.001, options.weightKg),
    services: options.services,
  });

  try {
    const res = await fetch(`${cfg.baseUrl}/rs/ship/price`, {
      method: 'POST',
      headers: {
        Authorization: cfg.ratingAuth ?? cfg.shippingAuth ?? cfg.trackingAuth ?? '',
        Accept: RATE_V4,
        'Content-Type': RATE_V4,
        'Accept-Language': 'en-CA',
      },
      body: xml,
      cache: 'no-store',
      // Checkout must stay snappy: 5s budget, then fall back to flat rate.
      signal: AbortSignal.timeout(5000),
    });
    const body = await res.text();
    if (!res.ok) {
      // Business-rule errors (bad postal, no eligible service) → no quotes,
      // which the caller treats as "use the fallback".
      console.error('[canadapost] rates HTTP', res.status, body.slice(0, 300));
      return { available: true, quotes: [] };
    }
    return { available: true, quotes: parsePriceQuotes(body) };
  } catch (e) {
    if (e instanceof CanadaPostError) throw e;
    // Network/timeout — degrade to flat rate rather than blocking checkout.
    console.error('[canadapost] rates request failed:', e instanceof Error ? e.message : e);
    return { available: true, quotes: [] };
  }
}
