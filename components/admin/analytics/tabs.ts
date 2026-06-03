export const ANALYTICS_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'revenue', label: 'Revenue' },
  { id: 'products', label: 'Products' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'customers', label: 'Customers' },
  { id: 'discounts', label: 'Discounts' },
  { id: 'operations', label: 'Operations' },
  { id: 'custom_orders', label: 'Custom orders' },
] as const;

export type AnalyticsTabId = (typeof ANALYTICS_TABS)[number]['id'];

export function isAnalyticsTabId(value: unknown): value is AnalyticsTabId {
  return typeof value === 'string' && ANALYTICS_TABS.some((t) => t.id === value);
}
