/**
 * Rough catalogue weight used for rate quotes (kg): a charm or two plus
 * packaging. Intentionally in a client-safe module: both the server quote
 * path and client-side code may reference it, unlike
 * lib/shipping/canadapost.ts which is server-only.
 */
export const DEFAULT_PARCEL_WEIGHT_KG = 0.25;
