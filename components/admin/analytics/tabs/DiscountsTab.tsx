'use client';

import { SortableWidget } from '../widgets/SortableWidget';
import { InlineDiscountToggle } from '../widgets/InlineDiscountToggle';
import { ExportButton } from '../controls/ExportButton';
import { formatMoney, formatNumber, formatShortDate } from '@/lib/admin/analytics/format';
import type { AnalyticsFilters, AnalyticsSnapshot, WidgetId } from "@/lib/admin/analytics/types";

type DiscountsTabProps = {
  filters: AnalyticsFilters;
  snapshot: AnalyticsSnapshot;
  isWidgetVisible: (id: WidgetId) => boolean;
};

export function DiscountsTab({ filters, snapshot, isWidgetVisible }: DiscountsTabProps) {
  return (
    <div className="analytics-grid">
      {isWidgetVisible('discount-performance') && (
        <SortableWidget
          id="discount-performance"
          title="Discount codes"
          badge={`${snapshot.discounts.length}`}
          span="full"
          toolbar={
            <ExportButton
              filename="discounts"
              rows={snapshot.discounts.map((d) => ({
                code: d.code,
                type: d.discount_type,
                value: d.discount_value,
                min_order: d.min_order_amount,
                uses: d.current_uses,
                max_uses: d.max_uses ?? 'unlimited',
                active: d.is_active,
                starts: d.starts_at,
                expires: d.expires_at,
              }))}
            />
          }
        >
          {snapshot.discounts.length === 0 ? (
            <div className="analytics-empty">No discount codes yet — <a href="/admin/discounts" className="text-plum-700">create one</a>.</div>
          ) : (
            <table className="analytics-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Type</th>
                  <th className="numeric">Value</th>
                  <th className="numeric">Uses</th>
                  <th>Schedule</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.discounts.map((d) => (
                  <tr key={d.id}>
                    <td className="font-medium text-plum-900">{d.code}</td>
                    <td className="capitalize">{d.discount_type}</td>
                    <td className="numeric">
                      <strong>{d.discount_type === 'percentage' ? `${d.discount_value}%` : formatMoney(d.discount_value)}</strong>
                    </td>
                    <td className="numeric">
                      {formatNumber(d.current_uses)}{' '}
                      <span className="text-xs text-ink-500">/ {d.max_uses ?? '∞'}</span>
                    </td>
                    <td className="text-xs text-ink-500">
                      {d.starts_at ? formatShortDate(d.starts_at) : '—'} → {d.expires_at ? formatShortDate(d.expires_at) : 'never'}
                    </td>
                    <td>
                      <InlineDiscountToggle discountId={d.id} isActive={d.is_active && !d.is_expired} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </SortableWidget>
      )}
    </div>
  );
}
