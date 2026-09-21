/**
 * Ticker themes and types — safe for both server and client imports.
 *
 * The five colour pairs are drawn from the site's own palette (plums, creams,
 * plus rosewood and pine accents that already appear in the brand), so any
 * choice looks native on the storefront.
 */

export type TickerTheme = 'plum' | 'plumMint' | 'cream' | 'rosewood' | 'pine';

export const TICKER_THEMES: Record<
  TickerTheme,
  { label: string; swatch: string; classes: string }
> = {
  plum: {
    label: 'Plum (default)',
    swatch: '#3b2260',
    classes: 'border-plum-950/40 bg-gradient-to-r from-plum-900 via-plum-800 to-plum-900 text-cream-100',
  },
  plumMint: {
    label: 'Plum & Mint',
    swatch: '#5d3373',
    classes: 'border-plum-950/40 bg-gradient-to-r from-plum-800 via-plum-600 to-plum-800 text-cream-50',
  },
  cream: {
    label: 'Cream',
    swatch: '#f5f0e6',
    classes: 'border-cream-300 bg-gradient-to-r from-cream-100 via-cream-50 to-cream-100 text-plum-900',
  },
  rosewood: {
    label: 'Rosewood',
    swatch: '#8a3b52',
    classes: 'border-plum-950/40 bg-gradient-to-r from-[#7a2f45] via-[#93435c] to-[#7a2f45] text-cream-50',
  },
  pine: {
    label: 'Pine',
    swatch: '#2f4a3c',
    classes: 'border-plum-950/40 bg-gradient-to-r from-[#27402f] via-[#3c5c47] to-[#27402f] text-cream-50',
  },
};

export type TickerConfig = {
  published: boolean;
  messages: string[];
  theme: TickerTheme;
};

export const TICKER_SLUG = 'ticker';

/** The hard defaults — also what the ticker falls back to on any failure. */
export const DEFAULT_TICKER: TickerConfig = {
  published: true,
  messages: ['Free shipping on orders over $50 CAD'],
  theme: 'plum',
};

export function normaliseTheme(value: unknown): TickerTheme {
  return typeof value === 'string' && value in TICKER_THEMES
    ? (value as TickerTheme)
    : DEFAULT_TICKER.theme;
}

export function normaliseMessages(value: unknown): string[] {
  if (!Array.isArray(value)) return DEFAULT_TICKER.messages;
  const cleaned = value
    .filter((m): m is string => typeof m === 'string')
    .map((m) => m.trim().slice(0, 140))
    .filter(Boolean);
  return cleaned.length > 0 ? cleaned : DEFAULT_TICKER.messages;
}
