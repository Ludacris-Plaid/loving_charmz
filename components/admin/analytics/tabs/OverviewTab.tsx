'use client';

import { KpiCard } from '../charts/KpiCard';
import { BarChart } from '../charts/BarChart';
import { DonutChart } from '../charts/DonutChart';
import { AreaChart } from '../charts/Sparkline';
import { SortableWidget } from '../widgets/SortableWidget';
import { RevenueChartWidget } from '../widgets/RevenueChartWidget';
import { InlineOrderStatusMenu } from '../widgets/InlineOrderStatusMenu';
import { ExportButton } from '../controls/ExportButton';
import { formatMoney, formatNumber, formatDelta, formatShortDate } from '@/lib/admin/analytics/format';
import { getBucketLabel } from '@/lib/admin/analytics/aggregate';
import type { AnalyticsFilters, AnalyticsSnapshot, WidgetId } from "@/lib/admin/analytics/types";

type OverviewTabProps = {
  filters: AnalyticsFilters;
  snapshot: AnalyticsSnapshot;
  isWidgetVisible: (id: WidgetId) => boolean;
};

export function OverviewTab({ filters, snapshot, isWidgetVisible }: OverviewTabProps) {
  const k = snapshot.kpis;
  return (
    <div className="space-y-4">
      {isWidgetVisible('kpi-revenue') && (
        <section className="analytics-kpi-row kpi-row-8">
          <KpiCard kpi={k.revenue} accent="plum" href="/admin/orders" />
          <KpiCard kpi={k.orders} accent="mint" href="/admin/orders" />
          <KpiCard kpi={k.aov} accent="plum" hint="Per order" />
          <KpiCard kpi={k.customers} accent="mint" href="/admin/customers" />
        </section>
      )}
      {isWidgetVisible('kpi-new-customers') && (
        <section className="analytics-kpi-row kpi-row-8">
          <KpiCard kpi={k.newCustomers} accent="plum" href="/admin/customers" hint="Profiles created" />
          <KpiCard kpi={k.unitsSold} accent="mint" hint="Items shipped" />
          <KpiCard kpi={k.refundRate} accent="plum" hint="Of orders" />
          <KpiCard kpi={k.conversionRate} accent="mint" hint="Orders per customer" />
        </section>
      )}

      <div className="analytics-grid">
        {isWidgetVisible('revenue-chart') && (
          <SortableWidget id="revenue-chart" title="Revenue over time" badge={`${snapshot.range.days} days`} span="two-thirds">
            <RevenueChartWidget
              series={snapshot.revenueSeries}
              compare={filters.compare}
              annotations={snapshot.annotations}
            />
          </SortableWidget>
        )}

        {isWidgetVisible('orders-by-status') && (
          <SortableWidget id="orders-by-status" title="Orders by status" span="third">
            {/* Horizontal bars: one row per status actually present, count +
                share + revenue. A donut lied here whenever most orders shared
                one status (a 97% circle reads as broken). */}
            <div className="space-y-2.5">
              {(() => {
                const total = snapshot.ordersByStatus.reduce((s, x) => s + x.count, 0);
                const palette: Record<string, string> = {
                  pending: 'var(--color-cream-300)',
                  processing: 'var(--color-mint-300)',
                  shipped: 'var(--color-mint-500)',
                  delivered: 'var(--color-plum-700)',
                  cancelled: 'var(--color-ink-300)',
                  refunded: 'var(--color-plum-300)',
                };
                const max = Math.max(...snapshot.ordersByStatus.map((s) => s.count), 1);
                if (total === 0) {
                  return <div className="analytics-empty">No orders in the selected range.</div>;
                }
                return (
                  <>
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs font-medium uppercase tracking-wider text-ink-500">Total orders</span>
                      <span className="font-display text-2xl font-semibold text-plum-900">{formatNumber(total)}</span>
                    </div>
                    {snapshot.ordersByStatus.map((s) => {
                      const pct = Math.round((s.count / total) * 100);
                      return (
                        <div key={s.status} className="analytics-statusbreak-row">
                          <div className="flex items-baseline justify-between text-sm">
                            <span className="font-medium capitalize text-ink-800">{s.status}</span>
                            <span className="text-ink-600">
                              {formatNumber(s.count)}
                              <span className="ml-1.5 text-xs text-ink-400">· {pct}%</span>
                            </span>
                          </div>
                          <div className="analytics-statusbreak-track" role="presentation">
                            <div
                              className="analytics-statusbreak-fill"
                              style={{
                                width: `${Math.max((s.count / max) * 100, 4)}%`,
                                background: palette[s.status] ?? 'var(--color-plum-500)',
                              }}
                            />
                          </div>
                          <div className="text-xs text-ink-500">{formatMoney(s.revenue)}</div>
                        </div>
                      );
                    })}
                  </>
                );
              })()}
            </div>
          </SortableWidget>
        )}

        {isWidgetVisible('action-items') && snapshot.actionItems.length > 0 && (
          <SortableWidget id="action-items" title="Action items" span="half">
            <div className="analytics-action-list">
              {snapshot.actionItems.map((a) => (
                <a key={a.id} className="analytics-action" href={a.href}>
                  <span className={`analytics-action-severity ${a.severity}`}>
                    {a.severity === 'critical' ? '!' : a.severity === 'warning' ? '⚠' : 'i'}
                  </span>
                  <div className="analytics-action-body">
                    <div className="analytics-action-title">
                      {a.title}
                      {a.count !== undefined && <span className="analytics-action-count">{a.count}</span>}
                    </div>
                    <div className="analytics-action-desc">{a.description}</div>
                  </div>
                  <span className="analytics-action-arrow" aria-hidden>→</span>
                </a>
              ))}
            </div>
          </SortableWidget>
        )}

        {isWidgetVisible('recent-activity') && (
          <SortableWidget
            id="recent-activity"
            title="Recent orders"
            span="full"
            toolbar={
              <ExportButton
                filename="recent-orders"
                rows={snapshot.recentOrders.map((o) => ({
                  id: o.id,
                  customer: o.customer_name ?? '(guest)',
                  date: o.created_at,
                  items: o.item_count,
                  status: o.status,
                  total: Number(o.total).toFixed(2),
                }))}
              />
            }
          >
            <div className="analytics-list">
              {snapshot.recentOrders.length > 0 ? (
                <table className="analytics-table">
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Customer</th>
                      <th>Date</th>
                      <th>Items</th>
                      <th>Status</th>
                      <th className="numeric">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshot.recentOrders.map((o) => (
                      <tr key={o.id}>
                        <td>#{o.id.slice(0, 8).toUpperCase()}</td>
                        <td>{o.customer_name ?? <span className="analytics-empty-inline">Guest</span>}</td>
                        <td>{formatShortDate(o.created_at)}</td>
                        <td>{o.item_count}</td>
                        <td><InlineOrderStatusMenu orderId={o.id} currentStatus={o.status} /></td>
                        <td className="numeric"><strong>{formatMoney(Number(o.total))}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="analytics-empty">No orders in the selected range. Try widening the date range or clearing filters.</div>
              )}
            </div>
          </SortableWidget>
        )}
      </div>
    </div>
  );
}
