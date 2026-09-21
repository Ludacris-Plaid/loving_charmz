/**
 * Canada Post delivery service codes shown in the admin label form.
 * Kept in a client-safe module because lib/shipping/canadapost.ts is
 * server-only and cannot be imported from client components.
 */
export const CP_SERVICE_CODES = [
  { code: 'DOM.RP', label: 'Regular Parcel (domestic)' },
  { code: 'DOM.EP', label: 'Expedited Parcel (domestic)' },
  { code: 'DOM.XP', label: 'Xpresspost (domestic)' },
  { code: 'DOM.PC', label: 'Priority (domestic)' },
  { code: 'USA.TP', label: 'Tracked Packet — USA' },
  { code: 'USA.EP', label: 'Expedited Parcel USA' },
  { code: 'USA.XP', label: 'Xpresspost USA' },
  { code: 'INT.TP', label: 'Tracked Packet — International' },
  { code: 'INT.XP', label: 'Xpresspost International' },
] as const;
