/**
 * Canadian sales tax, province by province.
 *
 * Replaces the old flat 8%: Alberta's GST is 5% (no provincial component),
 * while HST provinces charge their combined rate. Rates are the amount
 * *charged on taxable goods* — keepsake charms are standard-rated, and we
 * do not implement zero-rated exemptions here.
 *
 * The checkout address' `state` field carries the province code (e.g. "AB")
 * as typed or auto-filled; matching is by code first, then by name, and
 * anything unrecognised (including US states and overseas addresses)
 * defaults to Alberta's 5% GST — the store ships from Alberta, so imports
 * are handled by the carrier, not by us.
 */

export type TaxRegion = {
  code: string;
  name: string;
  /** Combined federal + provincial rate as a decimal. */
  rate: number;
  /** What the line item is called on receipts and emails. */
  label: string;
};

export const TAX_REGIONS: TaxRegion[] = [
  { code: 'AB', name: 'Alberta', rate: 0.05, label: 'GST' },
  { code: 'BC', name: 'British Columbia', rate: 0.12, label: 'GST/PST' },
  { code: 'SK', name: 'Saskatchewan', rate: 0.11, label: 'GST/PST' },
  { code: 'MB', name: 'Manitoba', rate: 0.12, label: 'GST/PST' },
  { code: 'ON', name: 'Ontario', rate: 0.13, label: 'HST' },
  { code: 'QC', name: 'Quebec', rate: 0.14975, label: 'GST/QST' },
  { code: 'NB', name: 'New Brunswick', rate: 0.15, label: 'HST' },
  { code: 'NS', name: 'Nova Scotia', rate: 0.15, label: 'HST' },
  { code: 'PE', name: 'Prince Edward Island', rate: 0.15, label: 'HST' },
  { code: 'NL', name: 'Newfoundland and Labrador', rate: 0.15, label: 'HST' },
  { code: 'NT', name: 'Northwest Territories', rate: 0.05, label: 'GST' },
  { code: 'YT', name: 'Yukon', rate: 0.05, label: 'GST' },
  { code: 'NU', name: 'Nunavut', rate: 0.05, label: 'GST' },
];

export const DEFAULT_TAX_REGION = TAX_REGIONS[0];

function normalise(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Resolves the tax region for a checkout address. Accepts the two-letter
 * code ("AB"), the full name ("Alberta"), or case variants; unknown values
 * fall back to Alberta GST. Non-Canada countries always take the default.
 */
export function taxRegionForAddress(address: {
  country?: string | null;
  state?: string | null;
}): TaxRegion {
  if ((address.country || '').trim().toUpperCase() !== 'CA') {
    return DEFAULT_TAX_REGION;
  }
  const province = (address.state || '').trim();
  if (!province) return DEFAULT_TAX_REGION;

  const byCode = TAX_REGIONS.find((r) => r.code === province.toUpperCase());
  if (byCode) return byCode;

  const byName = TAX_REGIONS.find((r) => normalise(r.name) === normalise(province));
  return byName ?? DEFAULT_TAX_REGION;
}
