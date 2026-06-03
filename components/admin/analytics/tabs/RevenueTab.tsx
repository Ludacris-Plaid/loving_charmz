'use client';

import { SortableWidget } from '../widgets/SortableWidget';
import { RevenueChartWidget } from '../widgets/RevenueChartWidget';
import { BarChart } from '../charts/BarChart';
import { Heatmap } from '../charts/Heatmap';
import { ExportButton } from '../controls/ExportButton';
import { formatMoney, formatNumber, formatDelta } from '@/lib/admin/analytics/format';
import { getBucketLabel } from '@/lib/admin/analytics/aggregate';
import type { AnalyticsFilters, AnalyticsSnapshot, WidgetId } from "@/lib/admin/analytics/types";

type RevenueTabProps = {
  filters: AnalyticsFilters;
  snapshot: AnalyticsSnapshot;
  isWidgetVisible: (id: WidgetId) => boolean;
};

export function RevenueTab({ filters, snapshot, isWidgetVisible }: RevenueTabProps) {
  const ordersBar = snapshot.ordersSeries.points.map((p) => ({
    label: getBucketLabel(p.date, filters.granularity),
    value: p.value,
    previousValue: filters.compare ? p.previousValue : undefined,
  }));

  return (
    <div className="analytics-grid">
      {isWidgetVisible('revenue-chart') && (
        <SortableWidget id="revenue-chart" title="Revenue over time" badge={`${snapshot.range.days}d · ${filters.granularity}`} span="full">
          <RevenueChartWidget series={snapshot.revenueSeries} compare={filters.compare} annotations={snapshot.annotations} />
          <div className="mt-2 flex items-center justify-end gap-3 text-xs text-ink-600">
            <span>
              Total: <strong className="text-plum-900">{formatMoney(snapshot.revenueSeries.total)}</strong>
            </span>
            {filters.compare && (
              <span>
                vs previous: <strong className={snapshot.revenueSeries.total > 0 ? 'text-mint-500' : 'text-plum-700'}>{formatDelta(snapshot.kpis.revenue.delta.deltaPct)}</strong>
              </span>
            )}
          </div>
        </SortableWidget>
      )}

      {isWidgetVisible('orders-chart') && (
        <SortableWidget id="orders-chart" title="Orders over time" span="half">
          <BarChart
            data={ordersBar}
            showPrevious={filters.compare}
            height={200}
            yFormat={(v) => formatNumber(v)}
            orientation="vertical"
          />
        </SortableWidget>
      )}

      {isWidgetVisible('payment-methods') && (
        <SortableWidget id="payment-methods" title="Revenue by payment method" span="half">
          <BarChart
            data={snapshot.paymentMethods.map((m) => ({
              label: m.method,
              value: m.amount,
            }))}
            orientation="horizontal"
            yFormat={(v) => formatMoney(v, { decimals: 0 })}
          />
        </SortableWidget>
      )}

      {isWidgetVisible('payment-status') && (
        <SortableWidget id="payment-status" title="Payment status" span="half">
          <div className="analytics-status-bar">
            {snapshot.paymentStatusBuckets.map((b) => {
              const total = snapshot.paymentStatusBuckets.reduce((s, x) => s + x.count, 0);
              const pct = total > 0 ? (b.count / total) * 100 : 0;
              return (
                <div key={b.status} className="analytics-status-row">
                  <span className={`analytics-status-pill ${b.status}`}>{b.status}</span>
                  <div className="analytics-status-track">
                    <div className="analytics-status-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="analytics-status-count">{b.count}</span>
                  <span className="text-xs text-ink-500 ml-2">{formatMoney(b.amount, { decimals: 0 })}</span>
                </div>
              );
            })}
          </div>
        </SortableWidget>
      )}

      {isWidgetVisible('fulfillment-histogram') && (
        <SortableWidget
          id="fulfillment-histogram"
          title="Fulfillment time"
          badge={`Avg ${snapshot.avgFulfillmentDays.toFixed(1)}d`}
          span="half"
        >
          <BarChart
            data={snapshot.fulfillmentHistogram.map((b) => ({ label: b.bucket, value: b.count }))}
            orientation="horizontal"
            yFormat={(v) => formatNumber(v)}
          />
        </SortableWidget>
      )}

      {isWidgetVisible('heatmap') && (
        <SortableWidget id="heatmap" title="Order heatmap (day × hour)" span="full">
          <Heatmap data={snapshot.heatmap} />
        </SortableWidget>
      )}
    </div>
  );
}
