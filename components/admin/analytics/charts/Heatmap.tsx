'use client';

import type { HeatmapPoint } from '@/lib/admin/analytics/types';

type HeatmapProps = {
  data: HeatmapPoint[];
  className?: string;
};

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function Heatmap({ data, className }: HeatmapProps) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const lookup = new Map(data.map((d) => [`${d.weekday}-${d.hour}`, d.value]));

  const cellWidth = 18;
  const cellHeight = 22;
  const leftLabelWidth = 36;
  const topLabelHeight = 18;
  const w = leftLabelWidth + 24 * cellWidth + 4;
  const h = topLabelHeight + 7 * cellHeight + 4;

  function intensity(v: number): string {
    if (v === 0) return 'var(--color-cream-100)';
    const t = v / max;
    if (t < 0.2) return 'var(--color-plum-100)';
    if (t < 0.4) return 'var(--color-plum-200)';
    if (t < 0.6) return 'var(--color-plum-400)';
    if (t < 0.8) return 'var(--color-plum-600)';
    return 'var(--color-plum-800)';
  }

  return (
    <div className={`analytics-heatmap ${className ?? ''}`}>
      <svg width="100%" viewBox={`0 0 ${w} ${h}`}>
        {HOURS.map((hr) => (
          <text
            key={hr}
            x={leftLabelWidth + hr * cellWidth + cellWidth / 2}
            y={topLabelHeight - 4}
            textAnchor="middle"
            className="analytics-heatmap-axis"
          >
            {hr % 3 === 0 ? `${hr.toString().padStart(2, '0')}` : ''}
          </text>
        ))}
        {WEEKDAYS.map((wd, wi) => (
          <text
            key={wd}
            x={leftLabelWidth - 6}
            y={topLabelHeight + wi * cellHeight + cellHeight / 2 + 4}
            textAnchor="end"
            className="analytics-heatmap-axis"
          >
            {wd}
          </text>
        ))}
        {WEEKDAYS.flatMap((_, wi) =>
          HOURS.map((hr) => {
            const v = lookup.get(`${wi}-${hr}`) ?? 0;
            return (
              <rect
                key={`${wi}-${hr}`}
                x={leftLabelWidth + hr * cellWidth}
                y={topLabelHeight + wi * cellHeight}
                width={cellWidth - 2}
                height={cellHeight - 2}
                fill={intensity(v)}
                rx="2"
              >
                <title>{`${WEEKDAYS[wi]} ${hr.toString().padStart(2, '0')}:00 — ${v} order${v === 1 ? '' : 's'}`}</title>
              </rect>
            );
          }),
        )}
      </svg>
      <div className="analytics-heatmap-legend">
        <span>Less</span>
        <span className="analytics-heatmap-swatch" style={{ background: 'var(--color-cream-100)' }} />
        <span className="analytics-heatmap-swatch" style={{ background: 'var(--color-plum-100)' }} />
        <span className="analytics-heatmap-swatch" style={{ background: 'var(--color-plum-200)' }} />
        <span className="analytics-heatmap-swatch" style={{ background: 'var(--color-plum-400)' }} />
        <span className="analytics-heatmap-swatch" style={{ background: 'var(--color-plum-600)' }} />
        <span className="analytics-heatmap-swatch" style={{ background: 'var(--color-plum-800)' }} />
        <span>More</span>
      </div>
    </div>
  );
}
