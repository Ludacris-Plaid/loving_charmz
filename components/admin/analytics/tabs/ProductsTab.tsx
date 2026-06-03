'use client';

import { SortableWidget } from '../widgets/SortableWidget';
import { BarChart } from '../charts/BarChart';
import { ExportButton } from '../controls/ExportButton';
import { formatMoney, formatNumber, formatPct } from '@/lib/admin/analytics/format';
import type { AnalyticsFilters, AnalyticsSnapshot, WidgetId } from "@/lib/admin/analytics/types";

type ProductsTabProps = {
  filters: AnalyticsFilters;
  snapshot: AnalyticsSnapshot;
  isWidgetVisible: (id: WidgetId) => boolean;
};

export function ProductsTab({ filters, snapshot, isWidgetVisible }: ProductsTabProps) {
  return (
    <div className="analytics-grid">
      {isWidgetVisible('top-products') && (
        <SortableWidget
          id="top-products"
          title="Top products"
          badge={`${snapshot.topProducts.length}`}
          span="full"
          toolbar={
            <ExportButton
              filename="top-products"
              rows={snapshot.topProducts.map((p) => ({
                product: p.product_name,
                slug: p.product_slug,
                units: p.units,
                orders: p.orders,
                revenue: p.revenue.toFixed(2),
              }))}
            />
          }
        >
          <table className="analytics-table">
            <thead>
              <tr>
                <th>Product</th>
                <th className="numeric">Units</th>
                <th className="numeric">Orders</th>
                <th className="numeric">Avg price</th>
                <th className="numeric">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.topProducts.map((p) => (
                <tr key={p.product_id}>
                  <td>
                    <a href={`/admin/products/${p.product_slug}`} className="text-plum-700 hover:text-plum-900 motion-base font-medium">
                      {p.product_name.replace('analytics-seed ', '')}
                    </a>
                  </td>
                  <td className="numeric">{formatNumber(p.units)}</td>
                  <td className="numeric">{formatNumber(p.orders)}</td>
                  <td className="numeric">{formatMoney(p.units > 0 ? p.revenue / p.units : 0)}</td>
                  <td className="numeric"><strong>{formatMoney(p.revenue)}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </SortableWidget>
      )}

      {isWidgetVisible('collection-revenue') && (
        <SortableWidget id="collection-revenue" title="Revenue by collection" span="half">
          {snapshot.collectionRevenue.length === 0 ? (
            <div className="analytics-empty">No collection revenue in this range.</div>
          ) : (
            <BarChart
              data={snapshot.collectionRevenue.map((c) => ({ label: c.collection_name, value: c.revenue }))}
              orientation="horizontal"
              yFormat={(v) => formatMoney(v, { decimals: 0 })}
            />
          )}
        </SortableWidget>
      )}

      {isWidgetVisible('wishlist-engagement') && (
        <SortableWidget id="wishlist-engagement" title="Wishlist → order conversion" span="half">
          {snapshot.wishlistEngagement.length === 0 ? (
            <div className="analytics-empty">No wishlist data yet.</div>
          ) : (
            <table className="analytics-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th className="numeric">Wishlists</th>
                  <th className="numeric">Orders</th>
                  <th className="numeric">Conv.</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.wishlistEngagement.map((w) => (
                  <tr key={w.product_id}>
                    <td>{w.product_name}</td>
                    <td className="numeric">{formatNumber(w.wishlists)}</td>
                    <td className="numeric">{formatNumber(w.orders)}</td>
                    <td className="numeric"><strong>{formatPct(w.conversion_pct)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </SortableWidget>
      )}

      {isWidgetVisible('cohort') && (
        <SortableWidget id="cohort" title="Customer cohorts" span="full">
          <table className="analytics-cohort-table">
            <thead>
              <tr>
                <th>Cohort</th>
                <th>Customers</th>
                <th>Orders</th>
                <th>Revenue</th>
                <th>AOV</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.cohort.map((c) => (
                <tr key={c.cohort}>
                  <td>{c.cohort}</td>
                  <td className="numeric">{formatNumber(c.customers)}</td>
                  <td className="numeric">{formatNumber(c.orders)}</td>
                  <td className="numeric"><strong>{formatMoney(c.revenue)}</strong></td>
                  <td className="numeric">{formatMoney(c.avgOrderValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </SortableWidget>
      )}
    </div>
  );
}
