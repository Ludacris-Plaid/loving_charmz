'use client';

import type { Series, AnnotationRow } from '@/lib/admin/analytics/types';
import { AreaChart } from '../charts/Sparkline';
import { getBucketLabel } from '@/lib/admin/analytics/aggregate';
import { AnnotationDialog } from './AnnotationDialog';

type RevenueChartWidgetProps = {
  series: Series;
  compare: boolean;
  annotations: AnnotationRow[];
};

export function RevenueChartWidget({ series, compare, annotations }: RevenueChartWidgetProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <AnnotationDialog annotations={annotations} />
      </div>
      <div style={{ position: 'relative' }}>
        <AreaChart
          series={[{ ...series, id: series.id || 'revenue', label: series.label || 'Revenue' }]}
          showPrevious={compare}
          annotations={annotations}
          formatBucket={(d) => getBucketLabel(d, 'day')}
          yFormat={(v) => (v >= 1000 ? `$${(v / 1000).toFixed(1)}K` : `$${v.toFixed(0)}`)}
        />
      </div>
    </div>
  );
}
