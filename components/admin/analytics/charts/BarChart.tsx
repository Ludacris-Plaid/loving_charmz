'use client';

import { useId } from 'react';

type BarDatum = {
  label: string;
  value: number;
  previousValue?: number;
  color?: string;
  href?: string;
};

type BarChartProps = {
  data: BarDatum[];
  height?: number;
  showPrevious?: boolean;
  className?: string;
  yFormat?: (v: number) => string;
  orientation?: 'vertical' | 'horizontal';
  onClickHref?: (label: string) => string | undefined;
};

const DEFAULT_COLORS = [
  'var(--color-plum-700)',
  'var(--color-plum-500)',
  'var(--color-mint-500)',
  'var(--color-mint-300)',
  'var(--color-plum-300)',
];

export function BarChart({
  data,
  height = 240,
  showPrevious = false,
  className,
  yFormat = (v) => v.toLocaleString('en-US'),
  orientation = 'vertical',
  onClickHref,
}: BarChartProps) {
  const id = useId();
  if (data.length === 0) {
    return <div className="analytics-empty">No data</div>;
  }

  if (orientation === 'horizontal') {
    const padding = { top: 8, right: 60, bottom: 8, left: 120 };
    const rowHeight = 24;
    const innerHeight = data.length * rowHeight;
    const innerWidth = 460;
    const w = innerWidth + padding.left + padding.right;
    const h = innerHeight + padding.top + padding.bottom;
    const max = Math.max(1, ...data.flatMap((d) => [d.value, showPrevious ? d.previousValue ?? 0 : 0]));
    const barWidth = innerWidth;
    return (
      <div className={`analytics-chart ${className ?? ''}`}>
        <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`}>
          {data.map((d, i) => {
            const y = padding.top + i * rowHeight;
            const valueWidth = (d.value / max) * barWidth;
            const prevWidth = showPrevious && d.previousValue !== undefined ? (d.previousValue / max) * barWidth : 0;
            return (
              <g key={`${d.label}-${i}`}>
                <text
                  x={padding.left - 8}
                  y={y + rowHeight / 2 + 4}
                  textAnchor="end"
                  className="analytics-bar-label"
                >
                  {d.label}
                </text>
                {showPrevious && d.previousValue !== undefined && (
                  <rect
                    x={padding.left}
                    y={y + 4}
                    width={prevWidth}
                    height={rowHeight - 12}
                    fill="var(--color-ink-300)"
                    opacity="0.4"
                    rx="2"
                  />
                )}
                <rect
                  x={padding.left}
                  y={y + (showPrevious ? 4 : 2)}
                  width={valueWidth}
                  height={showPrevious ? rowHeight - 12 : rowHeight - 4}
                  fill={d.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length]}
                  rx="3"
                  className="analytics-bar"
                >
                  {onClickHref?.(d.label) && <title>{d.label}</title>}
                </rect>
                <text
                  x={padding.left + valueWidth + 6}
                  y={y + (showPrevious ? 4 : 2) + (rowHeight - 12) / 2 + 4}
                  className="analytics-bar-value"
                >
                  {yFormat(d.value)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  }

  const padding = { top: 16, right: 16, bottom: 32, left: 48 };
  const innerWidth = 600;
  const innerHeight = height;
  const w = innerWidth;
  const h = innerHeight;
  const max = Math.max(1, ...data.flatMap((d) => [d.value, showPrevious ? d.previousValue ?? 0 : 0])) * 1.1;
  const groupWidth = (w - padding.left - padding.right) / data.length;
  const barWidth = showPrevious ? (groupWidth - 8) / 2 : groupWidth - 12;
  const ticks = 4;
  const yTicks = Array.from({ length: ticks + 1 }, (_, i) => (max / ticks) * i);
  const yScale = (v: number) => padding.top + (h - padding.top - padding.bottom) * (1 - v / max);
  const labelStep = Math.max(1, Math.floor(data.length / 6));

  return (
    <div className={`analytics-chart ${className ?? ''}`}>
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`}>
        {yTicks.map((v, i) => {
          const y = yScale(v);
          return (
            <g key={i}>
              <line
                x1={padding.left}
                x2={w - padding.right}
                y1={y}
                y2={y}
                stroke="var(--color-cream-300)"
                strokeWidth="1"
                strokeDasharray={i === 0 ? '0' : '2 3'}
                opacity={i === 0 ? 0.8 : 0.4}
              />
              <text x={padding.left - 8} y={y + 4} textAnchor="end" className="analytics-axis-label">
                {yFormat(v)}
              </text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const x = padding.left + i * groupWidth + 4;
          const valueX = showPrevious ? x : x + (groupWidth - barWidth) / 2 - 2;
          return (
            <g key={`${d.label}-${i}`}>
              {showPrevious && d.previousValue !== undefined && (
                <rect
                  x={x}
                  y={yScale(d.previousValue)}
                  width={barWidth}
                  height={h - padding.bottom - yScale(d.previousValue)}
                  fill="var(--color-ink-300)"
                  opacity="0.4"
                  rx="2"
                />
              )}
              <rect
                x={valueX}
                y={yScale(d.value)}
                width={barWidth}
                height={h - padding.bottom - yScale(d.value)}
                fill={d.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length]}
                rx="3"
                className="analytics-bar"
              >
                <title>{`${d.label}: ${yFormat(d.value)}`}</title>
              </rect>
              {(i % labelStep === 0 || i === data.length - 1) && (
                <text
                  x={x + groupWidth / 2 - 2}
                  y={h - 8}
                  textAnchor="middle"
                  className="analytics-axis-label"
                >
                  {d.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
