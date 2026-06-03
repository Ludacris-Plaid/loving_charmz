import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import type {
  AnalyticsFilters,
  AnalyticsSnapshot,
  Kpi,
  OrdersByStatus,
  TopProductRow,
  TopCustomerRow,
  CohortRow,
  InventoryRow,
  DiscountRow,
  CustomOrderPipelineRow,
  FulfillmentBucket,
  PaymentMethodBreakdown,
  PaymentStatusBucket,
  ActionItem,
  AnnotationRow,
  CollectionRevenueRow,
  HeatmapPoint,
  WishlistEngagementRow,
} from './types';
import {
  resolveDateRange,
  getBucketKey,
  buildSeries,
  buildSparkline,
  computeDelta,
  inRange,
} from './aggregate';
import { formatMoney, formatNumber } from './format';

type Order = {
  id: string;
  user_id: string | null;
  status: string;
  subtotal: number;
  shipping_cost: number;
  tax: number;
  discount: number;
  total: number;
  payment_method: string | null;
  payment_status: string;
  shipping_address: unknown;
  created_at: string;
  updated_at: string;
};

type OrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  variant_id: string | null;
  product_name: string;
  variant_name: string | null;
  unit_price: number;
  quantity: number;
};

type Product = {
  id: string;
  name: string;
  slug: string;
  base_price: number;
  is_active: boolean;
  is_personalizable: boolean;
};

type Variant = {
  id: string;
  product_id: string;
  name: string;
  sku: string | null;
  price_adjustment: number;
  stock_quantity: number;
  is_active: boolean;
};

type Collection = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
};

function statusKey(s: string): string {
  return (s || 'unknown').toLowerCase();
}

function applyOrderFilters(orders: Order[], filters: AnalyticsFilters): Order[] {
  if (filters.statuses.length) {
    const set = new Set(filters.statuses);
    orders = orders.filter((o) => set.has(statusKey(o.status) as never));
  }
  if (filters.paymentStatuses.length) {
    const set = new Set(filters.paymentStatuses);
    orders = orders.filter((o) => set.has(statusKey(o.payment_status) as never));
  }
  return orders;
}

export async function getAnalyticsSnapshot(filters: AnalyticsFilters): Promise<AnalyticsSnapshot> {
  const range = resolveDateRange(filters.preset, filters.start, filters.end);
  const admin = createAdminClient();

  const [
    productsRes,
    collectionsRes,
    variantsRes,
    collectionProductsRes,
    ordersRes,
    orderItemsRes,
    profilesRes,
    wishlistsRes,
    discountsRes,
    personalizationsRes,
    annotationsRes,
    paymentTxRes,
  ] = await Promise.all([
    admin.from('products').select('*'),
    admin.from('collections').select('*'),
    admin.from('product_variants').select('*'),
    admin.from('collection_products').select('*'),
    admin.from('orders').select('*'),
    admin.from('order_items').select('*'),
    admin.from('profiles').select('*'),
    admin.from('wishlists').select('*'),
    admin.from('discounts').select('*'),
    admin.from('personalization_requests').select('*'),
    admin.from('analytics_annotations').select('*').order('annotation_date', { ascending: true }),
    admin.from('payment_transactions').select('*'),
  ]);

  const products = (productsRes.data || []) as Product[];
  const collections = (collectionsRes.data || []) as Collection[];
  const variants = (variantsRes.data || []) as Variant[];
  const collectionProducts = (collectionProductsRes.data || []) as { collection_id: string; product_id: string }[];
  const allOrders = (ordersRes.data || []) as Order[];
  const orderItems = (orderItemsRes.data || []) as OrderItem[];
  const profiles = (profilesRes.data || []) as { id: string; username: string; display_name: string | null; created_at: string }[];
  const wishlists = (wishlistsRes.data || []) as { user_id: string; product_id: string; created_at: string }[];
  const discounts = (discountsRes.data || []) as DiscountRow[];
  const personalizations = (personalizationsRes.data || []) as { id: string; status: string; created_at: string; updated_at: string; product_id: string | null; order_id: string | null; admin_notes: string | null }[];
  const annotations = (annotationsRes.data || []) as AnnotationRow[];
  const paymentTx = (paymentTxRes.data || []) as { id: string; order_id: string | null; provider: string; amount: number; status: string; created_at: string }[];

  const currentOrders = allOrders.filter((o) => inRange(o.created_at, range.start, range.end));
  const previousOrders = allOrders.filter((o) => inRange(o.created_at, range.previous.start, range.previous.end));
  const filteredCurrent = applyOrderFilters(currentOrders, filters);
  const filteredPrevious = applyOrderFilters(previousOrders, filters);

  const productFilter = filters.products.length ? new Set(filters.products) : null;
  const collectionFilter = filters.collections.length ? new Set(filters.collections) : null;

  const orderItemsByOrder = new Map<string, OrderItem[]>();
  for (const item of orderItems) {
    const arr = orderItemsByOrder.get(item.order_id) || [];
    arr.push(item);
    orderItemsByOrder.set(item.order_id, arr);
  }

  function inProductScope(orderId: string): boolean {
    if (!productFilter && !collectionFilter) return true;
    const items = orderItemsByOrder.get(orderId) || [];
    if (productFilter) {
      for (const it of items) {
        if (it.product_id && productFilter.has(it.product_id)) return true;
      }
    }
    if (collectionFilter) {
      for (const it of items) {
        if (it.product_id) {
          const inCol = collectionProducts.some(
            (cp) => cp.product_id === it.product_id && collectionFilter!.has(cp.collection_id),
          );
          if (inCol) return true;
        }
      }
    }
    return false;
  }

  const scopedCurrent = filteredCurrent.filter((o) => inProductScope(o.id));
  const scopedPrevious = filteredPrevious.filter((o) => inProductScope(o.id));

  const currentRevenue = scopedCurrent.reduce((s, o) => s + Number(o.total || 0), 0);
  const previousRevenue = scopedPrevious.reduce((s, o) => s + Number(o.total || 0), 0);
  const currentOrderCount = scopedCurrent.length;
  const previousOrderCount = scopedPrevious.length;
  const currentUnits = scopedCurrent.reduce(
    (s, o) => s + (orderItemsByOrder.get(o.id) || []).reduce((u, i) => u + i.quantity, 0),
    0,
  );
  const previousUnits = scopedPrevious.reduce(
    (s, o) => s + (orderItemsByOrder.get(o.id) || []).reduce((u, i) => u + i.quantity, 0),
    0,
  );

  const currentCustomerIds = new Set(scopedCurrent.map((o) => o.user_id).filter(Boolean) as string[]);
  const previousCustomerIds = new Set(scopedPrevious.map((o) => o.user_id).filter(Boolean) as string[]);
  const currentCustomerCount = currentCustomerIds.size;
  const previousCustomerCount = previousCustomerIds.size;
  const newCustomerIds = new Set(
    profiles
      .filter((p) => inRange(p.created_at, range.start, range.end))
      .map((p) => p.id),
  );
  const previousNewCustomerIds = new Set(
    profiles
      .filter((p) => inRange(p.created_at, range.previous.start, range.previous.end))
      .map((p) => p.id),
  );

  const refunded = scopedCurrent.filter((o) => statusKey(o.status) === 'refunded').length;
  const refundedPrev = scopedPrevious.filter((o) => statusKey(o.status) === 'refunded').length;

  function toKpi(label: string, current: number, previous: number, formatter: (n: number) => string, spark?: number[]): Kpi {
    return {
      label,
      value: current,
      formatted: formatter(current),
      delta: computeDelta(current, previous),
      sparkline: spark,
    };
  }

  const revenueSpark = buildRevenueSpark(allOrders, filters);
  const ordersSpark = buildOrdersSpark(allOrders, filters);
  const customersSpark = buildCustomersSpark(allOrders, filters);

  const revenueSeries = buildSeries(
    scopedCurrent.map((o) => ({ bucket: getBucketKey(o.created_at, filters.granularity), value: Number(o.total) })),
    range,
    filters.granularity,
    {
      includePrevious: filters.compare,
      previousRows: scopedPrevious.map((o) => ({ bucket: getBucketKey(o.created_at, filters.granularity), value: Number(o.total) })),
    },
  );
  revenueSeries.id = 'revenue';
  revenueSeries.label = 'Revenue';
  revenueSeries.color = 'plum';

  const ordersSeries = buildSeries(
    scopedCurrent.map((o) => ({ bucket: getBucketKey(o.created_at, filters.granularity), value: 1 })),
    range,
    filters.granularity,
    {
      includePrevious: filters.compare,
      previousRows: scopedPrevious.map((o) => ({ bucket: getBucketKey(o.created_at, filters.granularity), value: 1 })),
    },
  );
  ordersSeries.id = 'orders';
  ordersSeries.label = 'Orders';
  ordersSeries.color = 'mint';

  const unitsSeries = buildSeries(
    scopedCurrent.flatMap((o) => {
      const items = orderItemsByOrder.get(o.id) || [];
      return items.map((i) => ({ bucket: getBucketKey(o.created_at, filters.granularity), value: i.quantity }));
    }),
    range,
    filters.granularity,
  );
  unitsSeries.id = 'units';
  unitsSeries.label = 'Units';
  unitsSeries.color = 'plum-soft';

  const customersSeries = buildSeries(
    Array.from(currentCustomerIds).flatMap((id) => {
      const firstOrder = scopedCurrent
        .filter((o) => o.user_id === id)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0];
      return firstOrder ? [{ bucket: getBucketKey(firstOrder.created_at, filters.granularity), value: 1 }] : [];
    }),
    range,
    filters.granularity,
  );
  customersSeries.id = 'customers';
  customersSeries.label = 'New customers';
  customersSeries.color = 'mint-soft';

  const statusOrder = ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
  const statusMap = new Map<string, OrdersByStatus>();
  for (const o of scopedCurrent) {
    const k = statusKey(o.status);
    const entry = statusMap.get(k) || { status: k as OrdersByStatus['status'], count: 0, revenue: 0 };
    entry.count += 1;
    entry.revenue += Number(o.total || 0);
    statusMap.set(k, entry);
  }
  const ordersByStatus = statusOrder
    .map((s) => statusMap.get(s))
    .filter((x): x is OrdersByStatus => Boolean(x));

  const paymentMap = new Map<string, PaymentMethodBreakdown>();
  for (const o of scopedCurrent) {
    const method = (o.payment_method || 'unknown').toLowerCase();
    const entry = paymentMap.get(method) || { method, count: 0, amount: 0 };
    entry.count += 1;
    entry.amount += Number(o.total || 0);
    paymentMap.set(method, entry);
  }
  const paymentMethods = Array.from(paymentMap.values()).sort((a, b) => b.amount - a.amount);

  const payStatusMap = new Map<string, PaymentStatusBucket>();
  for (const o of scopedCurrent) {
    const k = statusKey(o.payment_status);
    const entry = payStatusMap.get(k) || { status: k as PaymentStatusBucket['status'], count: 0, amount: 0 };
    entry.count += 1;
    entry.amount += Number(o.total || 0);
    payStatusMap.set(k, entry);
  }
  const paymentStatusBuckets = Array.from(payStatusMap.values());

  const productAgg = new Map<string, TopProductRow>();
  for (const o of scopedCurrent) {
    const items = orderItemsByOrder.get(o.id) || [];
    for (const it of items) {
      if (!it.product_id) continue;
      const product = products.find((p) => p.id === it.product_id);
      const row = productAgg.get(it.product_id) || {
        product_id: it.product_id,
        product_name: it.product_name,
        product_slug: product?.slug || '',
        units: 0,
        revenue: 0,
        orders: 0,
      };
      row.units += it.quantity;
      row.revenue += Number(it.unit_price) * it.quantity;
      productAgg.set(it.product_id, row);
    }
  }
  for (const row of productAgg.values()) {
    const ids = new Set<string>();
    for (const o of scopedCurrent) {
      const items = orderItemsByOrder.get(o.id) || [];
      if (items.some((i) => i.product_id === row.product_id)) ids.add(o.id);
    }
    row.orders = ids.size;
  }
  const topProducts = Array.from(productAgg.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 12);

  const collectionAgg = new Map<string, CollectionRevenueRow>();
  for (const cp of collectionProducts) {
    const col = collections.find((c) => c.id === cp.collection_id);
    if (!col) continue;
    const row = collectionAgg.get(col.id) || {
      collection_id: col.id,
      collection_name: col.name,
      orders: 0,
      units: 0,
      revenue: 0,
    };
    for (const o of scopedCurrent) {
      const items = orderItemsByOrder.get(o.id) || [];
      const inThis = items.some((i) => i.product_id === cp.product_id);
      if (inThis) {
        row.orders += 1;
        row.units += items
          .filter((i) => i.product_id === cp.product_id)
          .reduce((s, i) => s + i.quantity, 0);
        row.revenue += items
          .filter((i) => i.product_id === cp.product_id)
          .reduce((s, i) => s + Number(i.unit_price) * i.quantity, 0);
      }
    }
    collectionAgg.set(col.id, row);
  }
  const collectionRevenue = Array.from(collectionAgg.values())
    .filter((r) => r.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue);

  const customerAgg = new Map<string, TopCustomerRow>();
  for (const o of scopedCurrent) {
    if (!o.user_id) continue;
    const profile = profiles.find((p) => p.id === o.user_id);
    const row = customerAgg.get(o.user_id) || {
      user_id: o.user_id,
      email: null,
      display_name: profile?.display_name || null,
      orders: 0,
      revenue: 0,
      last_order_at: null,
    };
    row.orders += 1;
    row.revenue += Number(o.total || 0);
    if (!row.last_order_at || o.created_at > row.last_order_at) row.last_order_at = o.created_at;
    customerAgg.set(o.user_id, row);
  }
  const topCustomers = Array.from(customerAgg.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  const cohortMap = new Map<string, CohortRow>();
  for (const o of scopedCurrent) {
    if (!o.user_id) continue;
    const profile = profiles.find((p) => p.id === o.user_id);
    if (!profile) continue;
    const cohort = profile.created_at.slice(0, 7);
    const row = cohortMap.get(cohort) || {
      cohort,
      customers: 0,
      revenue: 0,
      orders: 0,
      avgOrderValue: 0,
    };
    row.orders += 1;
    row.revenue += Number(o.total || 0);
    cohortMap.set(cohort, row);
  }
  const cohort: CohortRow[] = Array.from(cohortMap.values())
    .map((r) => {
      const ids = new Set<string>();
      for (const o of scopedCurrent) {
        const profile = profiles.find((p) => p.id === o.user_id);
        if (profile && profile.created_at.startsWith(r.cohort)) ids.add(o.user_id!);
      }
      r.customers = ids.size;
      r.avgOrderValue = r.orders > 0 ? r.revenue / r.orders : 0;
      return r;
    })
    .sort((a, b) => b.cohort.localeCompare(a.cohort))
    .slice(0, 8);

  const heatmap: HeatmapPoint[] = [];
  for (let weekday = 0; weekday < 7; weekday++) {
    for (let hour = 0; hour < 24; hour++) {
      heatmap.push({ weekday, hour, value: 0 });
    }
  }
  for (const o of scopedCurrent) {
    const d = new Date(o.created_at);
    const wd = (d.getDay() + 6) % 7;
    const hr = d.getHours();
    const p = heatmap.find((h) => h.weekday === wd && h.hour === hr);
    if (p) p.value += 1;
  }

  const inventoryAgg = new Map<string, InventoryRow>();
  for (const v of variants) {
    const product = products.find((p) => p.id === v.product_id);
    if (!product) continue;
    const soldInRange = scopedCurrent.reduce((s, o) => {
      const items = orderItemsByOrder.get(o.id) || [];
      return s + items.filter((i) => i.variant_id === v.id).reduce((u, i) => u + i.quantity, 0);
    }, 0);
    const daysInRange = Math.max(range.days, 1);
    const dailyVelocity = soldInRange / daysInRange;
    const daysOfCover = dailyVelocity > 0 ? v.stock_quantity / dailyVelocity : null;
    const unitPrice = Number(product.base_price) + Number(v.price_adjustment);
    const inventoryValue = unitPrice * v.stock_quantity;
    const status: InventoryRow['status'] = !v.is_active
      ? 'inactive'
      : v.stock_quantity === 0
        ? 'out_of_stock'
        : v.stock_quantity < 5
          ? 'low_stock'
          : 'in_stock';
    inventoryAgg.set(v.id, {
      variant_id: v.id,
      product_id: v.product_id,
      product_name: product.name,
      product_slug: product.slug,
      variant_name: v.name,
      sku: v.sku,
      stock_quantity: v.stock_quantity,
      is_active: v.is_active,
      unit_price: unitPrice,
      inventory_value: inventoryValue,
      units_sold: soldInRange,
      days_of_cover: daysOfCover,
      status,
    });
  }
  const inventory = Array.from(inventoryAgg.values());
  const inventoryValue = inventory.reduce((s, i) => s + i.inventory_value, 0);
  const previousInventoryValue = inventory.reduce((s, i) => {
    const previousSold = scopedPrevious.reduce((sp, o) => {
      const items = orderItemsByOrder.get(o.id) || [];
      return sp + items.filter((it) => it.variant_id === i.variant_id).reduce((u, it) => u + it.quantity, 0);
    }, 0);
    const adjustedQty = Math.max(0, i.stock_quantity + previousSold);
    return s + i.unit_price * adjustedQty;
  }, 0);
  const inventoryValueDelta = computeDelta(inventoryValue, previousInventoryValue);

  const lowStock = inventory.filter((i) => i.status === 'low_stock').sort((a, b) => a.stock_quantity - b.stock_quantity);
  const deadStock = inventory
    .filter((i) => i.stock_quantity > 0 && i.units_sold === 0)
    .sort((a, b) => b.inventory_value - a.inventory_value);
  const outOfStock = inventory.filter((i) => i.status === 'out_of_stock');

  const discountPerf: DiscountRow[] = discounts.map((d) => {
    const ordersWithCode = scopedCurrent.filter((o) => Number(o.discount) > 0);
    void ordersWithCode;
    const txDiscount = scopedCurrent.reduce((s, o) => s + Number(o.discount || 0), 0);
    const txRevenue = scopedCurrent.reduce((s, o) => s + Number(o.subtotal || 0), 0);
    void txRevenue;
    void txDiscount;
    const now = new Date();
    const isExpired = d.expires_at ? new Date(d.expires_at) < now : false;
    const isScheduled = d.starts_at ? new Date(d.starts_at) > now : false;
    return {
      ...d,
      is_expired: isExpired,
      is_scheduled: isScheduled,
      order_count: 0,
      total_discount_value: 0,
      total_revenue: 0,
    };
  });

  const pipelineMap = new Map<string, CustomOrderPipelineRow>();
  const statusOrderPersonalization = ['pending', 'in_review', 'approved', 'in_production', 'completed', 'cancelled'];
  for (const p of personalizations) {
    if (!inRange(p.created_at, range.start, range.end)) continue;
    const k = statusKey(p.status);
    const entry = pipelineMap.get(k) || {
      status: k as CustomOrderPipelineRow['status'],
      count: 0,
      avg_age_days: 0,
    };
    entry.count += 1;
    pipelineMap.set(k, entry);
  }
  for (const p of personalizations) {
    if (!inRange(p.created_at, range.start, range.end)) continue;
    const k = statusKey(p.status);
    const entry = pipelineMap.get(k);
    if (entry) {
      const ageDays = (Date.now() - new Date(p.created_at).getTime()) / 86400000;
      entry.avg_age_days = (entry.avg_age_days * (entry.count - 1) + ageDays) / entry.count;
    }
  }
  const customOrderPipeline = statusOrderPersonalization
    .map((s) => pipelineMap.get(s))
    .filter((x): x is CustomOrderPipelineRow => Boolean(x));
  const customOrderRevenueImpact = scopedCurrent
    .filter((o) => personalizations.some((p) => p.order_id === o.id))
    .reduce((s, o) => s + Number(o.total || 0), 0);

  const fulfillmentBuckets = [
    { bucket: '0-1d', min: 0, max: 1 },
    { bucket: '1-3d', min: 1, max: 3 },
    { bucket: '3-7d', min: 3, max: 7 },
    { bucket: '7-14d', min: 7, max: 14 },
    { bucket: '14-30d', min: 14, max: 30 },
    { bucket: '30d+', min: 30, max: 99999 },
  ];
  const fulfillment: FulfillmentBucket[] = fulfillmentBuckets.map((b) => ({ bucket: b.bucket, count: 0 }));
  let totalFulfillmentDays = 0;
  let fulfillmentCount = 0;
  for (const o of scopedCurrent) {
    if (o.status !== 'delivered' && o.status !== 'shipped') continue;
    const days = (new Date(o.updated_at).getTime() - new Date(o.created_at).getTime()) / 86400000;
    const idx = fulfillmentBuckets.findIndex((b) => days >= b.min && days < b.max);
    if (idx >= 0) {
      fulfillment[idx].count += 1;
      totalFulfillmentDays += days;
      fulfillmentCount += 1;
    }
  }
  const avgFulfillmentDays = fulfillmentCount > 0 ? totalFulfillmentDays / fulfillmentCount : 0;

  const actionItems: ActionItem[] = [];
  if (lowStock.length > 0) {
    actionItems.push({
      id: 'low-stock',
      severity: lowStock.length > 3 ? 'critical' : 'warning',
      title: `${lowStock.length} variant${lowStock.length === 1 ? '' : 's'} low on stock`,
      description: 'Reorder or disable variants running low to avoid overselling.',
      href: '/admin/inventory?status=low',
      count: lowStock.length,
    });
  }
  if (outOfStock.length > 0) {
    actionItems.push({
      id: 'out-of-stock',
      severity: 'critical',
      title: `${outOfStock.length} variant${outOfStock.length === 1 ? '' : 's'} out of stock`,
      description: 'Hidden from the storefront — restock or mark inactive.',
      href: '/admin/inventory?status=out',
      count: outOfStock.length,
    });
  }
  const pendingOrders = scopedCurrent.filter((o) => statusKey(o.status) === 'pending').length;
  if (pendingOrders > 0) {
    actionItems.push({
      id: 'pending-orders',
      severity: 'warning',
      title: `${pendingOrders} order${pendingOrders === 1 ? '' : 's'} awaiting fulfillment`,
      description: 'Move orders through processing, shipping, and delivery.',
      href: '/admin/orders?status=pending',
      count: pendingOrders,
    });
  }
  const pendingCustom = customOrderPipeline.find((c) => c.status === 'pending');
  if (pendingCustom && pendingCustom.count > 0) {
    actionItems.push({
      id: 'pending-personalization',
      severity: 'info',
      title: `${pendingCustom.count} custom request${pendingCustom.count === 1 ? '' : 's'} in queue`,
      description: 'Review and respond to personalization requests.',
      href: '/admin/personalization?status=pending',
      count: pendingCustom.count,
    });
  }
  const expiringSoon = discounts.filter((d) => {
    if (!d.expires_at) return false;
    const days = (new Date(d.expires_at).getTime() - Date.now()) / 86400000;
    return d.is_active && days > 0 && days <= 14;
  });
  if (expiringSoon.length > 0) {
    actionItems.push({
      id: 'discounts-expiring',
      severity: 'info',
      title: `${expiringSoon.length} discount${expiringSoon.length === 1 ? '' : 's'} expiring within 14 days`,
      description: 'Renew or replace soon-to-expire promotional codes.',
      href: '/admin/discounts',
      count: expiringSoon.length,
    });
  }
  const failedPayments = paymentStatusBuckets.find((p) => p.status === 'failed');
  if (failedPayments && failedPayments.count > 0) {
    actionItems.push({
      id: 'failed-payments',
      severity: 'critical',
      title: `${failedPayments.count} failed payment${failedPayments.count === 1 ? '' : 's'}`,
      description: `$${failedPayments.amount.toFixed(2)} in failed charges — review with the payment provider.`,
      href: '/admin/orders?payment_status=failed',
      count: failedPayments.count,
    });
  }
  const stuckPayments = scopedCurrent.filter((o) => statusKey(o.payment_status) === 'pending' && statusKey(o.status) !== 'cancelled');
  if (stuckPayments.length > 0) {
    actionItems.push({
      id: 'pending-payments',
      severity: 'warning',
      title: `${stuckPayments.length} order${stuckPayments.length === 1 ? '' : 's'} with pending payment`,
      description: 'Customer may have abandoned checkout. Consider an outreach or reminder.',
      href: '/admin/orders?payment_status=pending',
      count: stuckPayments.length,
    });
  }

  const wishlistAgg = new Map<string, WishlistEngagementRow>();
  for (const w of wishlists) {
    const product = products.find((p) => p.id === w.product_id);
    if (!product) continue;
    const row = wishlistAgg.get(w.product_id) || {
      product_id: w.product_id,
      product_name: product.name,
      wishlists: 0,
      orders: 0,
      conversion_pct: null,
    };
    row.wishlists += 1;
    wishlistAgg.set(w.product_id, row);
  }
  for (const o of scopedCurrent) {
    const items = orderItemsByOrder.get(o.id) || [];
    for (const it of items) {
      if (!it.product_id) continue;
      const row = wishlistAgg.get(it.product_id);
      if (row) row.orders += 1;
    }
  }
  for (const row of wishlistAgg.values()) {
    row.conversion_pct = row.wishlists > 0 ? (row.orders / row.wishlists) * 100 : null;
  }
  const wishlistEngagement = Array.from(wishlistAgg.values())
    .sort((a, b) => b.wishlists - a.wishlists)
    .slice(0, 10);

  const profileById = new Map(profiles.map((p) => [p.id, p] as const));
  const itemsByOrder = new Map<string, number>();
  for (const it of orderItems) {
    itemsByOrder.set(it.order_id, (itemsByOrder.get(it.order_id) ?? 0) + 1);
  }
  const recentOrders = [...filteredCurrent]
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
    .slice(0, 8)
    .map((o) => {
      const p = o.user_id ? profileById.get(o.user_id) : undefined;
      const name = (p?.display_name?.trim() || p?.username) ?? null;
      return {
        id: o.id,
        created_at: o.created_at,
        status: o.status,
        payment_status: o.payment_status,
        total: o.total,
        customer_name: name,
        item_count: itemsByOrder.get(o.id) ?? 0,
      };
    });

  const kpis: AnalyticsSnapshot['kpis'] = {
    revenue: toKpi('Revenue', currentRevenue, previousRevenue, (n) => formatMoney(n, { decimals: 0 }), revenueSpark),
    orders: toKpi('Orders', currentOrderCount, previousOrderCount, (n) => formatNumber(n), ordersSpark),
    aov: toKpi(
      'Average order value',
      currentOrderCount > 0 ? currentRevenue / currentOrderCount : 0,
      previousOrderCount > 0 ? previousRevenue / previousOrderCount : 0,
      (n) => formatMoney(n),
    ),
    customers: toKpi('Unique customers', currentCustomerCount, previousCustomerCount, (n) => formatNumber(n), customersSpark),
    newCustomers: toKpi('New customers', newCustomerIds.size, previousNewCustomerIds.size, (n) => formatNumber(n)),
    unitsSold: toKpi('Units sold', currentUnits, previousUnits, (n) => formatNumber(n)),
    refundRate: toKpi(
      'Refund rate',
      currentOrderCount > 0 ? (refunded / currentOrderCount) * 100 : 0,
      previousOrderCount > 0 ? (refundedPrev / previousOrderCount) * 100 : 0,
      (n) => `${n.toFixed(1)}%`,
    ),
    conversionRate: toKpi(
      'Conversion rate',
      currentOrderCount > 0 ? (currentOrderCount / Math.max(currentCustomerIds.size, 1)) * 100 : 0,
      0,
      (n) => `${n.toFixed(1)}%`,
    ),
  };

  return {
    range,
    filters,
    collections: collections.map((c) => ({ id: c.id, name: c.name, slug: c.slug })),
    products: products.map((p) => ({ id: p.id, name: p.name, slug: p.slug })),
    annotations,
    kpis,
    revenueSeries,
    ordersSeries,
    unitsSeries,
    customersSeries,
    ordersByStatus,
    paymentMethods,
    paymentStatusBuckets,
    topProducts,
    collectionRevenue,
    topCustomers,
    cohort,
    heatmap,
    inventory,
    inventoryValue,
    inventoryValueDelta,
    deadStock,
    lowStock,
    discounts: discountPerf,
    customOrderPipeline,
    customOrderRevenueImpact,
    fulfillmentHistogram: fulfillment,
    avgFulfillmentDays,
    actionItems,
    wishlistEngagement,
    recentOrders,
  };
}

function buildRevenueSpark(allOrders: Order[], filters: AnalyticsFilters): number[] {
  const days = 14;
  const out: number[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    dayStart.setDate(dayStart.getDate() - i);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);
    const total = allOrders
      .filter((o) => inRange(o.created_at, dayStart, dayEnd))
      .reduce((s, o) => s + Number(o.total || 0), 0);
    out.push(total);
  }
  void filters;
  return out;
}

function buildOrdersSpark(allOrders: Order[], filters: AnalyticsFilters): number[] {
  const days = 14;
  const out: number[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    dayStart.setDate(dayStart.getDate() - i);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);
    out.push(allOrders.filter((o) => inRange(o.created_at, dayStart, dayEnd)).length);
  }
  void filters;
  return out;
}

function buildCustomersSpark(allOrders: Order[], filters: AnalyticsFilters): number[] {
  const days = 14;
  const out: number[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    dayStart.setDate(dayStart.getDate() - i);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);
    const ids = new Set(
      allOrders
        .filter((o) => inRange(o.created_at, dayStart, dayEnd))
        .map((o) => o.user_id)
        .filter(Boolean) as string[],
    );
    out.push(ids.size);
  }
  void filters;
  return out;
}
