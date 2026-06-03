'use client';

import { SortableWidget } from '../widgets/SortableWidget';
import { InlineStockAdjust } from '../widgets/InlineStockAdjust';
import { ExportButton } from '../controls/ExportButton';
import { formatMoney, formatNumber, formatDays } from '@/lib/admin/analytics/format';
import type { AnalyticsFilters, AnalyticsSnapshot, WidgetId } from "@/lib/admin/analytics/types";

type InventoryTabProps = {
  filters: AnalyticsFilters;
  snapshot: AnalyticsSnapshot;
  isWidgetVisible: (id: WidgetId) => boolean;
};

export function InventoryTab({ filters, snapshot, isWidgetVisible }: InventoryTabProps) {
  return (
    <div className="analytics-grid">
      {isWidgetVisible('inventory-value') && (
        <SortableWidget
          id="inventory-value"
          title="Inventory valuation"
          span="half"
        >
          <div className="space-y-2">
            <p className="font-display text-3xl font-semibold plum-gradient-text">{formatMoney(snapshot.inventoryValue)}</p>
            <p className="text-sm text-ink-600">
              {snapshot.inventory.length} variants ·{' '}
              {snapshot.inventory.filter((i) => i.stock_quantity > 0).length} in stock
            </p>
            <p className="text-xs text-ink-500">
              Previous-period proxy: {formatMoney(snapshot.inventoryValueDelta.previous)} ({formatMoney(snapshot.inventoryValueDelta.delta)})
            </p>
          </div>
        </SortableWidget>
      )}

      {isWidgetVisible('inventory-health') && (
        <SortableWidget id="inventory-health" title="Inventory health" span="half">
          <div className="space-y-2">
            {[
              { label: 'In stock', count: snapshot.inventory.filter((i) => i.status === 'in_stock').length, color: 'var(--color-mint-500)' },
              { label: 'Low stock', count: snapshot.inventory.filter((i) => i.status === 'low_stock').length, color: 'var(--color-plum-500)' },
              { label: 'Out of stock', count: snapshot.inventory.filter((i) => i.status === 'out_of_stock').length, color: 'var(--color-plum-800)' },
              { label: 'Inactive', count: snapshot.inventory.filter((i) => i.status === 'inactive').length, color: 'var(--color-ink-300)' },
            ].map((row) => (
              <div key={row.label} className="flex items-center gap-2 text-sm">
                <span className="w-3 h-3 rounded-sm" style={{ background: row.color }} />
                <span className="flex-1 text-ink-700">{row.label}</span>
                <span className="font-display font-semibold text-plum-900">{row.count}</span>
              </div>
            ))}
          </div>
        </SortableWidget>
      )}

      {isWidgetVisible('low-stock') && (
        <SortableWidget id="low-stock" title="Low stock alerts" badge={`${snapshot.lowStock.length}`} span="full">
          {snapshot.lowStock.length === 0 ? (
            <div className="analytics-empty">All variants comfortably stocked.</div>
          ) : (
            <table className="analytics-table">
              <thead>
                <tr>
                  <th>Variant</th>
                  <th>SKU</th>
                  <th className="numeric">Stock</th>
                  <th className="numeric">Days cover</th>
                  <th className="numeric">Value</th>
                  <th className="numeric">Adjust</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.lowStock.map((v) => (
                  <tr key={v.variant_id}>
                    <td>
                      <a href={`/admin/products/${v.product_slug}`} className="text-plum-700 hover:text-plum-900 font-medium">
                        {v.product_name}
                      </a>
                      <div className="text-xs text-ink-500">{v.variant_name}</div>
                    </td>
                    <td className="text-xs text-ink-500">{v.sku ?? '—'}</td>
                    <td className="numeric"><strong className={v.stock_quantity === 0 ? 'text-plum-900' : 'text-plum-800'}>{v.stock_quantity}</strong></td>
                    <td className="numeric">{formatDays(v.days_of_cover)}</td>
                    <td className="numeric">{formatMoney(v.inventory_value)}</td>
                    <td className="numeric"><InlineStockAdjust variantId={v.variant_id} currentStock={v.stock_quantity} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </SortableWidget>
      )}

      {isWidgetVisible('dead-stock') && (
        <SortableWidget
          id="dead-stock"
          title="Dead stock"
          badge={`${snapshot.deadStock.length} variants`}
          span="full"
          toolbar={
            <ExportButton
              filename="dead-stock"
              rows={snapshot.deadStock.map((d) => ({
                product: d.product_name,
                variant: d.variant_name,
                sku: d.sku,
                stock: d.stock_quantity,
                value: d.inventory_value.toFixed(2),
              }))}
            />
          }
        >
          {snapshot.deadStock.length === 0 ? (
            <div className="analytics-empty">No variants have sat unsold in this range.</div>
          ) : (
            <table className="analytics-table">
              <thead>
                <tr>
                  <th>Variant</th>
                  <th>SKU</th>
                  <th className="numeric">In stock</th>
                  <th className="numeric">Units sold</th>
                  <th className="numeric">Tied-up value</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.deadStock.map((d) => (
                  <tr key={d.variant_id}>
                    <td>
                      <a href={`/admin/products/${d.product_slug}`} className="text-plum-700 hover:text-plum-900 font-medium">
                        {d.product_name}
                      </a>
                      <div className="text-xs text-ink-500">{d.variant_name}</div>
                    </td>
                    <td className="text-xs text-ink-500">{d.sku ?? '—'}</td>
                    <td className="numeric">{formatNumber(d.stock_quantity)}</td>
                    <td className="numeric">{formatNumber(d.units_sold)}</td>
                    <td className="numeric"><strong>{formatMoney(d.inventory_value)}</strong></td>
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
