'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useCallback, useMemo, useTransition } from 'react';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import type { AnalyticsFilters, AnalyticsSnapshot, WidgetId } from '@/lib/admin/analytics/types';
import { decodeFilters, encodeFilters, reorderWidgets, isWidgetVisible } from '@/lib/admin/analytics/urlState';
import { DateRangePicker } from './controls/DateRangePicker';
import { CompareToggle } from './controls/CompareToggle';
import { FilterChips } from './controls/FilterChips';
import { WidgetVisibilityMenu } from './controls/WidgetVisibilityMenu';
import { SavedViewsMenu } from './controls/SavedViewsMenu';
import { ANALYTICS_TABS, type AnalyticsTabId } from './tabs';
import { OverviewTab } from './tabs/OverviewTab';
import { RevenueTab } from './tabs/RevenueTab';
import { ProductsTab } from './tabs/ProductsTab';
import { InventoryTab } from './tabs/InventoryTab';
import { CustomersTab } from './tabs/CustomersTab';
import { DiscountsTab } from './tabs/DiscountsTab';
import { OperationsTab } from './tabs/OperationsTab';
import { CustomOrdersTab } from './tabs/CustomOrdersTab';

type AnalyticsShellProps = {
  snapshot: AnalyticsSnapshot;
  tab: AnalyticsTabId;
};

export function AnalyticsShell({ snapshot, tab }: AnalyticsShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const filters = useMemo<AnalyticsFilters>(
    () => decodeFilters(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );

  const onFiltersChange = useCallback(
    (next: AnalyticsFilters) => {
      const params = encodeFilters(next);
      const qs = params.toString();
      startTransition(() => {
        router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
      });
    },
    [pathname, router],
  );

  const onTabChange = useCallback(
    (next: AnalyticsTabId) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', next);
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [pathname, router, searchParams],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const ids = filters.widgets as WidgetId[];
      const oldIndex = ids.indexOf(active.id as WidgetId);
      const newIndex = ids.indexOf(over.id as WidgetId);
      if (oldIndex < 0 || newIndex < 0) return;
      const next = arrayMove(ids, oldIndex, newIndex);
      onFiltersChange(reorderWidgets(filters, next));
    },
    [filters, onFiltersChange],
  );

  const visible = useCallback((id: WidgetId) => isWidgetVisible(filters, id), [filters]);
  const widgetIds = filters.widgets as WidgetId[];

  const tabContent = (() => {
    switch (tab) {
      case 'overview': return <OverviewTab filters={filters} snapshot={snapshot} isWidgetVisible={visible} />;
      case 'revenue': return <RevenueTab filters={filters} snapshot={snapshot} isWidgetVisible={visible} />;
      case 'products': return <ProductsTab filters={filters} snapshot={snapshot} isWidgetVisible={visible} />;
      case 'inventory': return <InventoryTab filters={filters} snapshot={snapshot} isWidgetVisible={visible} />;
      case 'customers': return <CustomersTab filters={filters} snapshot={snapshot} isWidgetVisible={visible} />;
      case 'discounts': return <DiscountsTab filters={filters} snapshot={snapshot} isWidgetVisible={visible} />;
      case 'operations': return <OperationsTab filters={filters} snapshot={snapshot} isWidgetVisible={visible} />;
      case 'custom_orders': return <CustomOrdersTab filters={filters} snapshot={snapshot} isWidgetVisible={visible} />;
    }
  })();

  return (
    <div className="analytics-shell">
      <div className="analytics-section-header">
        <span className="badge-plum">Insights</span>
        <h1>Analytics</h1>
      </div>

      <nav className="analytics-tabs" aria-label="Analytics tabs">
        {ANALYTICS_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className="analytics-tab"
            aria-current={tab === t.id}
            onClick={() => onTabChange(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="analytics-controls">
        <DateRangePicker filters={filters} onChange={onFiltersChange} />
        <CompareToggle
          compare={filters.compare}
          onChange={(c) => onFiltersChange({ ...filters, compare: c })}
        />
        <FilterChips
          filters={filters}
          collections={snapshot.collections}
          products={snapshot.products}
          onChange={onFiltersChange}
        />
        <WidgetVisibilityMenu filters={filters} onChange={onFiltersChange} />
        <SavedViewsMenu filters={filters} onChange={onFiltersChange} />
        {isPending && (
          <span className="analytics-control" aria-live="polite">
            <span className="spinner-mark" style={{ width: 12, height: 12 }} />
            Updating…
          </span>
        )}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        id="analytics-dnd"
      >
        <SortableContext items={widgetIds} strategy={rectSortingStrategy}>
          {tabContent}
        </SortableContext>
      </DndContext>
    </div>
  );
}
