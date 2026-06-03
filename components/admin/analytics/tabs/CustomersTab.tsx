'use client';

import { SortableWidget } from '../widgets/SortableWidget';
import { KpiCard } from '../charts/KpiCard';
import { ExportButton } from '../controls/ExportButton';
import { formatMoney, formatNumber } from '@/lib/admin/analytics/format';
import type { AnalyticsFilters, AnalyticsSnapshot, WidgetId } from "@/lib/admin/analytics/types";

type CustomersTabProps = {
  filters: AnalyticsFilters;
  snapshot: AnalyticsSnapshot;
  isWidgetVisible: (id: WidgetId) => boolean;
};

export function CustomersTab({ filters, snapshot, isWidgetVisible }: CustomersTabProps) {
  return (
    <div className="space-y-4">
      {(isWidgetVisible('kpi-customers') || isWidgetVisible('kpi-new-customers') || isWidgetVisible('kpi-conversion-rate')) && (
        <section className="analytics-kpi-row kpi-row-8">
          {isWidgetVisible('kpi-customers') && <KpiCard kpi={snapshot.kpis.customers} accent="plum" href="/admin/customers" />}
          {isWidgetVisible('kpi-new-customers') && <KpiCard kpi={snapshot.kpis.newCustomers} accent="mint" href="/admin/customers" hint="Profiles created" />}
          {isWidgetVisible('kpi-aov') && <KpiCard kpi={snapshot.kpis.aov} accent="plum" hint="Per order" />}
          {isWidgetVisible('kpi-conversion-rate') && <KpiCard kpi={snapshot.kpis.conversionRate} accent="mint" hint="Orders per customer" />}
        </section>
      )}

      <div className="analytics-grid">
        {isWidgetVisible('top-customers') && (
          <SortableWidget
            id="top-customers"
            title="Top customers"
            badge={`${snapshot.topCustomers.length}`}
            span="half"
            toolbar={
              <ExportButton
                filename="top-customers"
                rows={snapshot.topCustomers.map((c) => ({
                  name: c.display_name ?? '(no name)',
                  email: c.email ?? '',
                  orders: c.orders,
                  revenue: c.revenue.toFixed(2),
                  last_order: c.last_order_at,
                }))}
              />
            }
          >
            <div className="analytics-list">
              {snapshot.topCustomers.map((c, i) => (
                <div key={c.user_id} className="analytics-list-row">
                  <span className="analytics-list-rank">{i + 1}</span>
                  <div className="analytics-list-bar">
                    <div className="analytics-list-name">
                      <span className="analytics-list-name-text">{c.display_name ?? c.email ?? 'Anonymous'}</span>
                      <span className="analytics-list-meta">{c.orders} orders</span>
                    </div>
                    <div className="analytics-list-track">
                      <div
                        className="analytics-list-fill"
                        style={{ width: `${(c.revenue / Math.max(snapshot.topCustomers[0]?.revenue || 1, 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="analytics-list-value">{formatMoney(c.revenue)}</span>
                </div>
              ))}
            </div>
          </SortableWidget>
        )}

        {isWidgetVisible('cohort') && (
          <SortableWidget id="cohort" title="Customer cohorts" span="half">
            <table className="analytics-cohort-table">
              <thead>
                <tr>
                  <th>Cohort</th>
                  <th>Customers</th>
                  <th>Orders</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.cohort.map((c) => (
                  <tr key={c.cohort}>
                    <td>{c.cohort}</td>
                    <td className="numeric">{formatNumber(c.customers)}</td>
                    <td className="numeric">{formatNumber(c.orders)}</td>
                    <td className="numeric"><strong>{formatMoney(c.revenue)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SortableWidget>
        )}

        {isWidgetVisible('wishlist-engagement') && (
          <SortableWidget id="wishlist-engagement" title="Wishlist engagement" span="full">
            {snapshot.wishlistEngagement.length === 0 ? (
              <div className="analytics-empty">No wishlist data yet.</div>
            ) : (
              <table className="analytics-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th className="numeric">Wishlists</th>
                    <th className="numeric">Orders</th>
                    <th className="numeric">Conversion</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.wishlistEngagement.map((w) => (
                    <tr key={w.product_id}>
                      <td>{w.product_name}</td>
                      <td className="numeric">{formatNumber(w.wishlists)}</td>
                      <td className="numeric">{formatNumber(w.orders)}</td>
                      <td className="numeric"><strong>{w.conversion_pct === null ? '—' : `${w.conversion_pct.toFixed(1)}%`}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </SortableWidget>
        )}
      </div>
    </div>
  );
}
