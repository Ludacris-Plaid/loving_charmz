/**
 * Single source of truth for what a cart costs.
 *
 * The checkout page renders these numbers and the payment provider is charged
 * these numbers. They must come from the same function: if the two ever drift,
 * the shopper is charged an amount that does not match the order total.
 */

export const CURRENCY = 'CAD';
export const FREE_SHIPPING_THRESHOLD = 50;
export const FLAT_SHIPPING_RATE = 9.99;
export const TAX_RATE = 0.08;

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

export function computeOrderTotals(lines: PricedLine[], discount?: DiscountInfo | null): OrderTotals {
  const subtotal = roundMoney(
    lines.reduce((sum, line) => sum + Number(line.unitPrice || 0) * Number(line.quantity || 0), 0),
  );
  const shipping = subtotal > 0 && subtotal <= FREE_SHIPPING_THRESHOLD ? FLAT_SHIPPING_RATE : 0;
  let discountAmount = 0;
  if (discount) {
    if (discount.type === 'percentage') {
      discountAmount = roundMoney(subtotal * (discount.value / 100));
    } else {
      discountAmount = Math.min(roundMoney(discount.value), subtotal);
    }
  }
  const tax = roundMoney((subtotal - discountAmount) * TAX_RATE);
  const total = roundMoney(subtotal - discountAmount + shipping + tax);
  return { subtotal, shipping, tax, discount: discountAmount, total };
}
