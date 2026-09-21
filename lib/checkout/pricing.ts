/**
 * Single source of truth for what a cart costs.
 *
 * The checkout page renders these numbers and the payment provider is charged
 * these numbers. They must come from the same function: if the two ever drift,
 * the shopper is charged an amount that does not match the order total.
 */

import { taxRegionForAddress, type TaxRegion } from './tax';

export const CURRENCY = 'CAD';
export const FREE_SHIPPING_THRESHOLD = 50;
export const FLAT_SHIPPING_RATE = 9.99;

export type PricedLine = {
  unitPrice: number;
  quantity: number;
};

export type OrderTotals = {
  subtotal: number;
  shipping: number;
  tax: number;
  discount: number;
  total: number;
  /** "GST", "HST", "GST/PST"… for receipts, emails and summaries. */
  taxLabel: string;
};

/** Round to whole cents, avoiding float artifacts like 12.344999999. */
export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function toNumber(value: number | string): number {
  const parsed = typeof value === 'string' ? Number(value) : value;
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Provider APIs want a decimal string such as "124.97" (PayPal). */
export function formatMoney(value: number | string): string {
  return roundMoney(toNumber(value)).toFixed(2);
}

/** Card processors want integer minor units, e.g. 12497 (Square). */
export function toMinorUnits(value: number | string): number {
  return Math.round(roundMoney(toNumber(value)) * 100);
}

export function lineUnitPrice(price: { base_price?: number | string | null; price_adjustment?: number | string | null }): number {
  return Number(price.base_price || 0) + Number(price.price_adjustment || 0);
}

export type DiscountInfo = {
  type: 'percentage' | 'fixed';
  value: number;
};

/**
 * Computes order totals. The tax region comes from the shipping address when
 * one is known; callers without an address yet (cart, pre-submit estimates)
 * omit it and get the Alberta default. Tax applies to the discounted
 * subtotal — the same treatment the CRA expects for point-of-sale discounts.
 *
 * `shippingOverride` lets callers replace the flat-rate rule with a live
 * Canada Post quote (checkout) while keeping every other branch identical.
 * Free-over-threshold applies to STANDARD shipping only (flat rate or CP
 * Regular Parcel): pass `expedited: true` when the shopper chose an express
 * service and the quoted price is charged even on a cart that qualifies.
 */
export function computeOrderTotals(
  lines: PricedLine[],
  discount?: DiscountInfo | null,
  taxRegion?: TaxRegion,
  shippingOverride?: number | null,
  shippingOpts?: { expedited?: boolean },
): OrderTotals {
  const region = taxRegion ?? taxRegionForAddress({ country: 'CA', state: 'AB' });
  const subtotal = roundMoney(
    lines.reduce((sum, line) => sum + Number(line.unitPrice || 0) * Number(line.quantity || 0), 0),
  );
  const freeShipping =
    subtotal > 0 && subtotal > FREE_SHIPPING_THRESHOLD && !shippingOpts?.expedited;
  const quoted =
    subtotal > 0 &&
    shippingOverride != null &&
    Number.isFinite(shippingOverride) &&
    shippingOverride >= 0
      ? roundMoney(shippingOverride)
      : null;
  const shipping = freeShipping ? 0 : quoted ?? (subtotal > 0 ? FLAT_SHIPPING_RATE : 0);
  let discountAmount = 0;
  if (discount) {
    if (discount.type === 'percentage') {
      discountAmount = roundMoney(subtotal * (discount.value / 100));
    } else {
      discountAmount = Math.min(roundMoney(discount.value), subtotal);
    }
  }
  const tax = roundMoney((subtotal - discountAmount) * region.rate);
  const total = roundMoney(subtotal - discountAmount + shipping + tax);
  return { subtotal, shipping, tax, discount: discountAmount, total, taxLabel: region.label };
}
