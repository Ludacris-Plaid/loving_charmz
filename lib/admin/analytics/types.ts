export type DateRangePreset = '7d' | '30d' | '90d' | 'ytd' | 'custom';

export type Granularity = 'day' | 'week' | 'month';

export type OrderStatus =
  | 'pending'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export type PersonalizationStatus = 'pending' | 'in_review' | 'approved' | 'in_production' | 'completed' | 'cancelled';

export type ResolvedDateRange = {
  start: Date;
  end: Date;
  preset: DateRangePreset;
  days: number;
  previous: { start: Date; end: Date };
};

export type KpiDelta = {
  current: number;
  previous: number;
  delta: number;
  deltaPct: number | null;
  direction: 'up' | 'down' | 'flat';
};

export type Kpi = {
  label: string;
  value: number;
  formatted: string;
  delta: KpiDelta;
  sparkline?: number[];
  hint?: string;
};

export type SeriesPoint = {
  date: string;
  value: number;
  previousValue?: number;
};

export type Series = {
  id: string;
  label: string;
  color: string;
  points: SeriesPoint[];
  total: number;
};

export type OrdersByStatus = {
  status: OrderStatus;
  count: number;
  revenue: number;
};

export type PaymentMethodBreakdown = {
  method: string;
  count: number;
  amount: number;
};

export type TopProductRow = {
  product_id: string;
  product_name: string;
  product_slug: string;
  units: number;
  revenue: number;
  orders: number;
};

export type TopCustomerRow = {
  user_id: string;
  email: string | null;
  display_name: string | null;
  orders: number;
  revenue: number;
  last_order_at: string | null;
};

export type CohortRow = {
  cohort: string;
  customers: number;
  revenue: number;
  orders: number;
  avgOrderValue: number;
};

export type InventoryRow = {
  variant_id: string;
  product_id: string;
  product_name: string;
  product_slug: string;
  variant_name: string;
  sku: string | null;
  stock_quantity: number;
  is_active: boolean;
  unit_price: number;
  inventory_value: number;
  units_sold: number;
  days_of_cover: number | null;
  status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'inactive';
};

export type DiscountRow = {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_amount: number;
  max_uses: number | null;
  current_uses: number;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  is_expired: boolean;
  is_scheduled: boolean;
  order_count: number;
  total_discount_value: number;
  total_revenue: number;
};

export type CustomOrderPipelineRow = {
  status: PersonalizationStatus;
  count: number;
  avg_age_days: number;
};

export type FulfillmentBucket = {
  bucket: string;
  count: number;
};

export type PaymentStatusBucket = {
  status: PaymentStatus;
  count: number;
  amount: number;
};

export type ActionItem = {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  href: string;
  count?: number;
};

export type AnnotationRow = {
  id: string;
  annotation_date: string;
  title: string;
  body: string | null;
  color: string;
  created_at: string;
};

export type AnalyticsFilters = {
  start: string;
  end: string;
  preset: DateRangePreset;
  granularity: Granularity;
  compare: boolean;
  collections: string[];
  products: string[];
  statuses: OrderStatus[];
  paymentStatuses: PaymentStatus[];
  widgets: string[];
};

export type SavedView = {
  id: string;
  name: string;
  filters: AnalyticsFilters;
};

export type HeatmapPoint = {
  weekday: number;
  hour: number;
  value: number;
};

export type CollectionRevenueRow = {
  collection_id: string;
  collection_name: string;
  orders: number;
  units: number;
  revenue: number;
};

export type WishlistEngagementRow = {
  product_id: string;
  product_name: string;
  wishlists: number;
  orders: number;
  conversion_pct: number | null;
};

export type RecentOrderRow = {
  id: string;
  created_at: string;
  status: string;
  payment_status: string;
  total: number;
  customer_name: string | null;
  item_count: number;
};

export type { WidgetId } from './urlState';

export type AnalyticsSnapshot = {
  range: ResolvedDateRange;
  filters: AnalyticsFilters;
  collections: { id: string; name: string; slug: string }[];
  products: { id: string; name: string; slug: string }[];
  annotations: AnnotationRow[];
  kpis: {
    revenue: Kpi;
    orders: Kpi;
    aov: Kpi;
    customers: Kpi;
    newCustomers: Kpi;
    unitsSold: Kpi;
    refundRate: Kpi;
    conversionRate: Kpi;
  };
  revenueSeries: Series;
  ordersSeries: Series;
  unitsSeries: Series;
  customersSeries: Series;
  ordersByStatus: OrdersByStatus[];
  paymentMethods: PaymentMethodBreakdown[];
  paymentStatusBuckets: PaymentStatusBucket[];
  topProducts: TopProductRow[];
  collectionRevenue: CollectionRevenueRow[];
  topCustomers: TopCustomerRow[];
  cohort: CohortRow[];
  heatmap: HeatmapPoint[];
  inventory: InventoryRow[];
  inventoryValue: number;
  inventoryValueDelta: KpiDelta;
  deadStock: InventoryRow[];
  lowStock: InventoryRow[];
  discounts: DiscountRow[];
  customOrderPipeline: CustomOrderPipelineRow[];
  customOrderRevenueImpact: number;
  fulfillmentHistogram: FulfillmentBucket[];
  avgFulfillmentDays: number;
  actionItems: ActionItem[];
  wishlistEngagement: WishlistEngagementRow[];
  recentOrders: RecentOrderRow[];
};
