'use client';

import { useState, useRef, useEffect } from 'react';
import type { AnalyticsFilters, WidgetId } from '@/lib/admin/analytics/types';
import { ALL_WIDGETS, WIDGET_LABELS, toggleWidget } from '@/lib/admin/analytics/urlState';

type WidgetVisibilityMenuProps = {
  filters: AnalyticsFilters;
  onChange: (next: AnalyticsFilters) => void;
  className?: string;
};

const TAB_WIDGETS: Record<string, WidgetId[]> = {
  overview: [
    'kpi-revenue', 'kpi-orders', 'kpi-aov', 'kpi-customers',
    'kpi-new-customers', 'kpi-units', 'kpi-refund-rate', 'kpi-conversion-rate',
    'revenue-chart', 'orders-by-status', 'action-items', 'recent-activity',
  ],
  revenue: ['revenue-chart', 'orders-chart', 'payment-methods', 'payment-status', 'fulfillment-histogram', 'heatmap'],
  products: ['top-products', 'collection-revenue', 'wishlist-engagement', 'cohort'],
  inventory: ['inventory-value', 'inventory-health', 'low-stock', 'dead-stock'],
  customers: ['top-customers', 'cohort', 'wishlist-engagement', 'kpi-customers', 'kpi-new-customers', 'kpi-conversion-rate'],
  discounts: ['discount-performance'],
  operations: ['action-items', 'fulfillment-histogram', 'payment-status', 'orders-by-status', 'recent-activity'],
  custom_orders: ['custom-order-pipeline'],
};

export function WidgetVisibilityMenu({ filters, onChange, className }: WidgetVisibilityMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <div ref={ref} className={`analytics-control-group ${className ?? ''}`}>
      <button type="button" className="analytics-control" onClick={() => setOpen((o) => !o)}>
        <span aria-hidden>◧</span>
        Widgets
      </button>
      {open && (
        <div className="analytics-control-dropdown" style={{ minWidth: 260, maxHeight: 400, overflowY: 'auto' }}>
          {Object.entries(TAB_WIDGETS).map(([tab, ids]) => (
            <div key={tab}>
              <div className="px-2 py-1 text-xs font-semibold text-plum-800 capitalize">{tab.replace('_', ' ')}</div>
              {ids.map((id) => (
                <label key={id} className="analytics-control-dropdown__item">
                  <input
                    type="checkbox"
                    checked={filters.widgets.includes(id)}
                    onChange={() => onChange(toggleWidget(filters, id as WidgetId))}
                  />
                  {WIDGET_LABELS[id as WidgetId] ?? id}
                </label>
              ))}
              <div className="analytics-control-dropdown__divider" />
            </div>
          ))}
          <div className="px-2 py-1 flex gap-1">
            <button
              type="button"
              className="analytics-control"
              onClick={() => onChange({ ...filters, widgets: [...ALL_WIDGETS] })}
            >
              Show all
            </button>
            <button
              type="button"
              className="analytics-control"
              onClick={() => onChange({ ...filters, widgets: [] })}
            >
              Hide all
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
