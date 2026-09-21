'use server';

import { getShippingRates } from './rates';
import { DEFAULT_PARCEL_WEIGHT_KG } from './weight';
import { flatOption, quoteToOption, type ShippingOption } from './quote-options';

/**
 * Shipping quote action for checkout.
 *
 * The client component calls this once the postal code is complete; it
 * returns live Canada Post options when credentials exist and usable
 * quotes come back, otherwise the flat-rate fallback.
 */

export async function quoteShippingAction(
  postalCode: string,
  country: string,
): Promise<{ options: ShippingOption[] }> {
  const trimmed = (postalCode || '').trim();
  if (trimmed.length < 3) {
    return { options: [flatOption()] };
  }

  const CA_POSTAL = /^[A-Za-z]\d[A-Za-z]\s?\d[A-Za-z]\d$/;
  const US_ZIP = /^\d{5}(-\d{4})?$/;
  const isCa = country === 'CA' && CA_POSTAL.test(trimmed);
  const isUs = country === 'US' && US_ZIP.test(trimmed);
  if (!isCa && !isUs) {
    return { options: [flatOption()] };
  }

  try {
    const result = await getShippingRates({
      destPostal: trimmed,
      destCountry: isCa ? 'CA' : 'US',
      weightKg: DEFAULT_PARCEL_WEIGHT_KG,
    });
    if (!result.available || result.quotes.length === 0) {
      return { options: [flatOption()] };
    }
    // Cheapest first; keep every quoted service so speed matters visibly.
    const options = result.quotes
      .slice()
      .sort((a, b) => a.due - b.due)
      .map(quoteToOption);
    return { options };
  } catch {
    return { options: [flatOption()] };
  }
}
