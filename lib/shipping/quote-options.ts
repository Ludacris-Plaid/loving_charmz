import { FLAT_SHIPPING_RATE } from '@/lib/checkout/pricing';
import type { CpRateQuote } from './rates';

/**
 * Shipping options surfaced at checkout — shared shape + helpers.
 *
 * Every option is priced at the live Canada Post rate for the shopper's
 * address; the flat-rate option exists only when live quoting is unavailable
 * (credentials missing, CP unreachable). Shipping is never free — the price
 * shown is the price charged.
 *
 * Split from lib/shipping/quote.ts because a 'use server' module may only
 * export async actions, and the client component needs the type + fallback.
 */

export type ShippingOption = {
  id: string; // 'flat' or the CP service code
  label: string;
  price: number;
  eta: string | null; // human-readable, e.g. "Arrives by Sep 26" or "2 business days"
  guaranteed: boolean;
  isLive: boolean;
};

export const SHIPPING_FLAT_ID = 'flat';

export function flatOption(): ShippingOption {
  return {
    id: SHIPPING_FLAT_ID,
    label: 'Standard shipping (Canada Post)',
    price: FLAT_SHIPPING_RATE,
    eta: null,
    guaranteed: false,
    isLive: false,
  };
}

export function quoteToOption(q: CpRateQuote): ShippingOption {
  let eta: string | null = null;
  if (q.expectedDeliveryDate) {
    const d = new Date(`${q.expectedDeliveryDate}T12:00:00Z`);
    if (!Number.isNaN(d.getTime())) {
      eta = `Arrives by ${d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}`;
    }
  } else if (q.transitDays != null) {
    eta = `${q.transitDays} business day${q.transitDays === 1 ? '' : 's'}`;
  }
  return {
    id: q.serviceCode,
    label: q.serviceName,
    price: q.due,
    eta,
    guaranteed: q.guaranteed,
    isLive: true,
  };
}
