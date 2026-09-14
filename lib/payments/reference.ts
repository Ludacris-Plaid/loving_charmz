/** Human-facing order reference, e.g. `LC-1F4C2A9B`. Display only. */
export function orderReference(orderId: string): string {
  const compact = orderId.replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toUpperCase();
  return `LC-${compact || 'NEW'}`;
}
