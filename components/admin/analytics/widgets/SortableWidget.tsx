'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ReactNode } from 'react';

type SortableWidgetProps = {
  id: string;
  title?: string;
  badge?: string;
  children: ReactNode;
  span?: 'half' | 'third' | 'quarter' | 'full' | 'two-thirds';
  toolbar?: ReactNode;
  footer?: ReactNode;
};

const SPAN_CLASS: Record<NonNullable<SortableWidgetProps['span']>, string> = {
  full: 'widget-span-full',
  'two-thirds': 'widget-span-2-3',
  half: 'widget-span-half',
  third: 'widget-span-third',
  quarter: 'widget-span-quarter',
};

export function SortableWidget({ id, title, badge, children, span = 'half', toolbar, footer }: SortableWidgetProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <section
      ref={setNodeRef}
      style={style}
      className={`analytics-widget surface-card inner-highlight ${SPAN_CLASS[span]} ${isDragging ? 'analytics-widget-dragging' : ''}`}
    >
      {(title || toolbar) && (
        <header className="analytics-widget-header">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              className="analytics-widget-drag-handle"
              aria-label="Drag to reorder"
              {...attributes}
              {...listeners}
            >
              <span aria-hidden>⋮⋮</span>
            </button>
            {title && <h2 className="analytics-widget-title">{title}</h2>}
            {badge && <span className="badge-mint ml-1">{badge}</span>}
          </div>
          {toolbar && <div className="analytics-widget-toolbar">{toolbar}</div>}
        </header>
      )}
      <div className="analytics-widget-body">{children}</div>
      {footer && <div className="analytics-widget-footer">{footer}</div>}
    </section>
  );
}
