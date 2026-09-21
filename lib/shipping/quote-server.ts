import 'server-only';

import { getShippingRates } from './rates';
import { DEFAULT_PARCEL_WEIGHT_KG } from './weight';

export const SHIPPING_FLAT_ID = 'flat';

/**
 * Server-side re-pricing for checkout submission.
 *
 * The browser sends the chosen service id; this module decides what that is
 * actually worth. A service id only turns into a live price when the current
 * Rating API quote for the given address contains exactly that service —
 * anything else (unknown id, CP unconfigured, CP error, stale quote) falls
 * back to null, which computeOrderTotals treats as the flat-rate rule.
 *
 * This is the checkout-side twin of the discount re-validation: what the
 * shopper picked is a *request*; the server's quote is the *price*.
 */
export async function resolveLiveShippingRate(options: {
  serviceId: string;
  postalCode: string;
  country: string;
}): Promise<number | null> {
  const { serviceId, postalCode, country } = options;
  if (!serviceId || serviceId === 'flat') return null;

  const trimmed = (postalCode || '').trim();
  const CA_POSTAL = /^[A-Za-z]\d[A-Za-z]\s?\d[A-Za-z]\d$/;
  const US_ZIP = /^\d{5}(-\d{4})?$/;
  const isCa = country === 'CA' && CA_POSTAL.test(trimmed);
  const isUs = country === 'US' && US_ZIP.test(trimmed);
  if (!isCa && !isUs) return null;

  try {
    const result = await getShippingRates({
      destPostal: trimmed,
      destCountry: isCa ? 'CA' : 'US',
      weightKg: DEFAULT_PARCEL_WEIGHT_KG,
    });
    if (!result.available) return null;
    const match = result.quotes.find((q) => q.serviceCode === serviceId);
    return match ? match.due : null;
  } catch {
    return null;
  }
}
