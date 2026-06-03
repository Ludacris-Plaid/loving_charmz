import type { AnalyticsFilters, DateRangePreset, Granularity, OrderStatus, PaymentStatus } from './types';

const PRESETS: DateRangePreset[] = ['7d', '30d', '90d', 'ytd', 'custom'];
const GRANULARITIES: Granularity[] = ['day', 'week', 'month'];
const ORDER_STATUSES: OrderStatus[] = ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
const PAYMENT_STATUSES: PaymentStatus[] = ['pending', 'paid', 'failed', 'refunded'];

export const ALL_WIDGETS = [
  'kpi-revenue',
  'kpi-orders',
  'kpi-aov',
  'kpi-customers',
  'kpi-new-customers',
  'kpi-units',
  'kpi-refund-rate',
  'kpi-conversion-rate',
  'revenue-chart',
  'orders-chart',
  'orders-by-status',
  'payment-methods',
  'payment-status',
  'fulfillment-histogram',
  'heatmap',
  'top-products',
  'collection-revenue',
  'wishlist-engagement',
  'top-customers',
  'cohort',
  'inventory-value',
  'inventory-health',
  'low-stock',
  'dead-stock',
  'discount-performance',
  'custom-order-pipeline',
  'action-items',
  'recent-activity',
] as const;

export type WidgetId = (typeof ALL_WIDGETS)[number];

export const WIDGET_LABELS: Record<WidgetId, string> = {
  'kpi-revenue': 'Revenue',
  'kpi-orders': 'Orders',
  'kpi-aov': 'Average order value',
  'kpi-customers': 'Total customers',
  'kpi-new-customers': 'New customers',
  'kpi-units': 'Units sold',
  'kpi-refund-rate': 'Refund rate',
  'kpi-conversion-rate': 'Conversion rate',
  'revenue-chart': 'Revenue over time',
  'orders-chart': 'Orders over time',
  'orders-by-status': 'Orders by status',
  'payment-methods': 'Payment methods',
  'payment-status': 'Payment status',
  'fulfillment-histogram': 'Fulfillment time',
  'heatmap': 'Order heatmap (day × hour)',
  'top-products': 'Top products',
  'collection-revenue': 'Revenue by collection',
  'wishlist-engagement': 'Wishlist engagement',
  'top-customers': 'Top customers',
  'cohort': 'Customer cohorts',
  'inventory-value': 'Inventory valuation',
  'inventory-health': 'Inventory health',
  'low-stock': 'Low stock alerts',
  'dead-stock': 'Dead stock',
  'discount-performance': 'Discount performance',
  'custom-order-pipeline': 'Custom order pipeline',
  'action-items': 'Action items',
  'recent-activity': 'Recent activity',
};

export const DEFAULT_FILTERS: AnalyticsFilters = {
  start: '',
  end: '',
  preset: '30d',
  granularity: 'day',
  compare: true,
  collections: [],
  products: [],
  statuses: [],
  paymentStatuses: [],
  widgets: [...ALL_WIDGETS],
};

const KEYS = {
  preset: 'p',
  start: 's',
  end: 'e',
  granularity: 'g',
  compare: 'c',
  collections: 'col',
  products: 'prd',
  statuses: 'st',
  paymentStatuses: 'ps',
  widgets: 'w',
  view: 'v',
} as const;

function parseList<T extends string>(v: string | null, allowed: readonly T[]): T[] {
  if (!v) return [];
  return v
    .split(',')
    .map((s) => s.trim())
    .filter((s): s is T => s.length > 0 && (allowed.length === 0 || (allowed as readonly string[]).includes(s)));
}

export function decodeFilters(params: URLSearchParams): AnalyticsFilters {
  const preset = (params.get(KEYS.preset) as DateRangePreset) || DEFAULT_FILTERS.preset;
  const granularity = (params.get(KEYS.granularity) as Granularity) || DEFAULT_FILTERS.granularity;
  const compare = params.get(KEYS.compare) !== '0';
  return {
    preset: PRESETS.includes(preset) ? preset : DEFAULT_FILTERS.preset,
    start: params.get(KEYS.start) || '',
    end: params.get(KEYS.end) || '',
    granularity: GRANULARITIES.includes(granularity) ? granularity : DEFAULT_FILTERS.granularity,
    compare,
    collections: parseList(params.get(KEYS.collections), []),
    products: parseList(params.get(KEYS.products), []),
    statuses: parseList(params.get(KEYS.statuses), ORDER_STATUSES),
    paymentStatuses: parseList(params.get(KEYS.paymentStatuses), PAYMENT_STATUSES),
    widgets: parseList(params.get(KEYS.widgets), ALL_WIDGETS).length > 0
      ? parseList(params.get(KEYS.widgets), ALL_WIDGETS)
      : [...ALL_WIDGETS],
  };
}

export function encodeFilters(filters: AnalyticsFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.preset !== DEFAULT_FILTERS.preset) params.set(KEYS.preset, filters.preset);
  if (filters.preset === 'custom') {
    if (filters.start) params.set(KEYS.start, filters.start);
    if (filters.end) params.set(KEYS.end, filters.end);
  }
  if (filters.granularity !== DEFAULT_FILTERS.granularity) params.set(KEYS.granularity, filters.granularity);
  if (!filters.compare) params.set(KEYS.compare, '0');
  if (filters.collections.length) params.set(KEYS.collections, filters.collections.join(','));
  if (filters.products.length) params.set(KEYS.products, filters.products.join(','));
  if (filters.statuses.length) params.set(KEYS.statuses, filters.statuses.join(','));
  if (filters.paymentStatuses.length) params.set(KEYS.paymentStatuses, filters.paymentStatuses.join(','));
  const defaultWidgets = DEFAULT_FILTERS.widgets.join(',');
  const activeWidgets = filters.widgets.join(',');
  if (activeWidgets !== defaultWidgets) params.set(KEYS.widgets, activeWidgets);
  return params;
}

export function isWidgetVisible(filters: AnalyticsFilters, id: WidgetId): boolean {
  return filters.widgets.includes(id);
}

export function toggleWidget(filters: AnalyticsFilters, id: WidgetId): AnalyticsFilters {
  const has = filters.widgets.includes(id);
  return {
    ...filters,
    widgets: has ? filters.widgets.filter((w) => w !== id) : [...filters.widgets, id],
  };
}

export function reorderWidgets(filters: AnalyticsFilters, ids: WidgetId[]): AnalyticsFilters {
  return { ...filters, widgets: ids };
}
