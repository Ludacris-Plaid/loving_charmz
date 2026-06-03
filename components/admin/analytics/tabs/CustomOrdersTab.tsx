'use client';

import { SortableWidget } from '../widgets/SortableWidget';
import { FunnelChart } from '../charts/FunnelChart';
import { formatMoney, formatNumber } from '@/lib/admin/analytics/format';
import type { AnalyticsFilters, AnalyticsSnapshot, WidgetId } from "@/lib/admin/analytics/types";

type CustomOrdersTabProps = {
  filters: AnalyticsFilters;
  snapshot: AnalyticsSnapshot;
  isWidgetVisible: (id: WidgetId) => boolean;
};

export function CustomOrdersTab({ filters, snapshot, isWidgetVisible }: CustomOrdersTabProps) {
  return (
    <div className="analytics-grid">
      {isWidgetVisible('custom-order-pipeline') && (
        <SortableWidget id="custom-order-pipeline" title="Custom order pipeline" span="two-thirds">
          <div className="grid sm:grid-cols-2 gap-6">
            <FunnelChart
              steps={snapshot.customOrderPipeline.map((s) => ({ label: s.status.replace('_', ' '), value: s.count }))}
              formatValue={(v) => formatNumber(v)}
            />
            <div>
              <p className="text-sm text-ink-600 mb-3">
                Revenue impact (orders with personalization):{' '}
                <strong className="text-plum-900">{formatMoney(snapshot.customOrderRevenueImpact)}</strong>
              </p>
              <table className="analytics-table">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th className="numeric">Count</th>
                    <th className="numeric">Avg age</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.customOrderPipeline.map((s) => (
                    <tr key={s.status}>
                      <td className="capitalize">{s.status.replace('_', ' ')}</td>
                      <td className="numeric"><strong>{s.count}</strong></td>
                      <td className="numeric">{s.avg_age_days.toFixed(1)}d</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </SortableWidget>
      )}
    </div>
  );
}
