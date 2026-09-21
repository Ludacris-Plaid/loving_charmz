import { FLAT_SHIPPING_RATE } from '@/lib/checkout/pricing';
import type { CpRateQuote } from './rates';

/**
 * Shipping options surfaced at checkout — shared shape + helpers.
 *
 * Live quotes come from the Canada Post Rating API when the shop has
 * credentials; otherwise (or when CP returns nothing usable) the list is a
 * single flat-rate option — exactly what the shop shipped with before this
 * feature existed. The client cannot tell the difference except by price.
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
  /** Standard tier (flat rate / Regular Parcel) — the only one free shipping covers. */
  isStandard: boolean;
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
    isStandard: true,
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
    // Regular Parcel is the standard tier; every other CP service is
    // expedited and excluded from the free-shipping promotion.
    isStandard: q.serviceCode === 'DOM.RP',
  };
}
