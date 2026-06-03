'use client';

import { SortableWidget } from '../widgets/SortableWidget';
import { BarChart } from '../charts/BarChart';
import { ExportButton } from '../controls/ExportButton';
import { formatMoney, formatNumber } from '@/lib/admin/analytics/format';
import type { AnalyticsFilters, AnalyticsSnapshot, WidgetId } from "@/lib/admin/analytics/types";

type OperationsTabProps = {
  filters: AnalyticsFilters;
  snapshot: AnalyticsSnapshot;
  isWidgetVisible: (id: WidgetId) => boolean;
};

export function OperationsTab({ filters, snapshot, isWidgetVisible }: OperationsTabProps) {
  return (
    <div className="analytics-grid">
      {isWidgetVisible('action-items') && (
        <SortableWidget id="action-items" title="Action items" span="full">
          {snapshot.actionItems.length === 0 ? (
            <div className="analytics-empty">All clear — no urgent items.</div>
          ) : (
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
          )}
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

      {isWidgetVisible('orders-by-status') && (
        <SortableWidget id="orders-by-status" title="Orders by status" span="half">
          <div className="analytics-status-bar">
            {snapshot.ordersByStatus.map((s) => {
              const total = snapshot.ordersByStatus.reduce((sum, x) => sum + x.count, 0);
              const pct = total > 0 ? (s.count / total) * 100 : 0;
              return (
                <div key={s.status} className="analytics-status-row">
                  <span className={`analytics-status-pill ${s.status}`}>{s.status}</span>
                  <div className="analytics-status-track">
                    <div className="analytics-status-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="analytics-status-count">{s.count}</span>
                  <span className="text-xs text-ink-500 ml-2">{formatMoney(s.revenue, { decimals: 0 })}</span>
                </div>
              );
            })}
          </div>
        </SortableWidget>
      )}
    </div>
  );
}
