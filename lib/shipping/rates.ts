import 'server-only';

import { CanadaPostError, cpJson, getCpConfig } from './canadapost';

/**
 * Canada Post Get Rates (rating/v1) — live shipping quotes at checkout.
 *
 * POST {gateway}/rating/v1/prices with a mailing-scenario JSON body;
 * returns one quote per eligible service (price incl. taxes, transit time,
 * delivery date). The "due" amount is the full landed cost (base +
 * surcharges + taxes), which is what a shopper expects to see.
 *
 * Semantics shared with the rest of the CP client:
 *  - not configured  → { available: false } (checkout falls back to flat rate)
 *  - CP unreachable/empty → { available: true, quotes: [] } (same fallback)
 */

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

const GATEWAY_RATING =
  'https://api.canadapost-postescanada.ca/prod/devportal-portaildesdeveloppeurs/rating/v1';

type RawQuote = {
  serviceCode?: string;
  serviceName?: string;
  priceDetails?: {
    due?: number;
    base?: number;
  };
  serviceStandard?: {
    guaranteedDelivery?: boolean;
    expectedTransitTime?: number;
    expectedDeliveryDate?: string;
  };
};

export type RateRequestInput = {
  quoteType: 'counter' | 'commercial';
  originPostal: string;
  destPostal: string;
  destCountry: 'CA' | 'US' | string;
  weightKg: number;
  services?: string[];
};

/** Build the mailing-scenario body for POST /rating/v1/prices. */
export function buildRateRequest(input: RateRequestInput): Record<string, unknown> {
  const { quoteType, originPostal, destPostal, destCountry, weightKg, services } = input;
  const isCa = destCountry === 'CA';
  const isUs = destCountry === 'US';
  const destination = isCa
    ? { domestic: { postalCode: destPostal.replace(/\s/g, '').toUpperCase() } }
    : isUs
      ? { unitedStates: { zipCode: destPostal.replace(/\s/g, '') } }
      : { international: { countryCode: destCountry } };

  const body: Record<string, unknown> = {
    quoteType,
    originPostalCode: originPostal.replace(/\s/g, '').toUpperCase(),
    destination,
    parcelCharacteristics: { weight: Math.max(0.001, weightKg) },
  };
  if (services?.length) body.services = services;

  return body;
}

/** Parse the priceQuotes array into usable quotes. */
export function parsePriceQuotes(payload: RawQuote[] | null): CpRateQuote[] {
  const items = Array.isArray(payload) ? payload : [];
  const quotes: CpRateQuote[] = [];
  for (const q of items) {
    const code = q?.serviceCode;
    const due = q?.priceDetails?.due;
    if (!code || typeof due !== 'number' || !Number.isFinite(due) || due < 0) continue;
    quotes.push({
      serviceCode: code,
      serviceName: q.serviceName || code,
      due: Math.round(due * 100) / 100,
      expectedDeliveryDate: q.serviceStandard?.expectedDeliveryDate ?? null,
      transitDays:
        typeof q.serviceStandard?.expectedTransitTime === 'number'
          ? q.serviceStandard.expectedTransitTime
          : null,
      guaranteed: q.serviceStandard?.guaranteedDelivery === true,
    });
  }
  return quotes;
}

export async function getShippingRates(options: {
  destPostal: string;
  destCountry: 'CA' | 'US' | string;
  weightKg: number;
  services?: string[];
}): Promise<CpRatesResult> {
  const cfg = getCpConfig();
  if (!cfg?.originPostal) return { available: false };

  try {
    // OAuth Bearer via the shared client; 5s budget so a slow Canada Post
    // can never hang checkout — the caller falls back to the flat rate.
    const { data } = await cpJson<RawQuote[]>(cfg, 'rating', `${GATEWAY_RATING}/prices`, {
      method: 'POST',
      body: buildRateRequest({
        quoteType: cfg.quoteType,
        originPostal: cfg.originPostal,
        destPostal: options.destPostal,
        destCountry: options.destCountry,
        weightKg: options.weightKg,
        services: options.services,
      }),
      timeoutMs: 5000,
    });
    return { available: true, quotes: parsePriceQuotes(data) };
  } catch (e) {
    if (e instanceof CanadaPostError) {
      // Business-rule errors (bad postal, no eligible service) and auth gaps
      // (Rating product not yet subscribed) both degrade to the flat rate.
      console.error('[canadapost] rates request declined:', e.message);
      return { available: true, quotes: [] };
    }
    // Network/timeout — degrade to flat rate rather than blocking checkout.
    console.error('[canadapost] rates request failed:', e instanceof Error ? e.message : e);
    return { available: true, quotes: [] };
  }
}
