'use client';

import { useId, useState } from 'react';

type SparklineProps = {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
  fill?: string;
  className?: string;
  strokeWidth?: number;
};

export function Sparkline({
  values,
  width = 80,
  height = 24,
  color = 'var(--color-plum-700)',
  fill = 'var(--color-plum-300)',
  className,
  strokeWidth = 1.5,
}: SparklineProps) {
  const id = useId();
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = width / (values.length - 1);

  const points = values.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return [x, y] as const;
  });

  const linePath = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`).join(' ');
  const areaPath = `${linePath} L ${width.toFixed(2)} ${height} L 0 ${height} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id={`spark-${id}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={fill} stopOpacity="0.5" />
          <stop offset="100%" stopColor={fill} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#spark-${id})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type AreaChartProps = {
  series: Array<{ id: string; label: string; color: string; points: Array<{ date: string; value: number; previousValue?: number }> }>;
  height?: number;
  showPrevious?: boolean;
  annotations?: Array<{ id: string; annotation_date: string; title: string; color: string }>;
  className?: string;
  yFormat?: (v: number) => string;
  formatBucket?: (date: string) => string;
};

const COLOR_MAP: Record<string, string> = {
  plum: 'var(--color-plum-700)',
  'plum-soft': 'var(--color-plum-300)',
  mint: 'var(--color-mint-500)',
  'mint-soft': 'var(--color-mint-300)',
};

const FILL_MAP: Record<string, string> = {
  plum: 'var(--color-plum-300)',
  'plum-soft': 'var(--color-plum-200)',
  mint: 'var(--color-mint-300)',
  'mint-soft': 'var(--color-mint-200)',
};

const ANNOTATION_COLOR: Record<string, string> = {
  plum: 'var(--color-plum-500)',
  mint: 'var(--color-mint-500)',
  cream: 'var(--color-cream-300)',
  ink: 'var(--color-ink-500)',
};

export function AreaChart({
  series,
  height = 220,
  showPrevious = false,
  annotations = [],
  className,
  yFormat = (v) => v.toLocaleString(),
  formatBucket,
}: AreaChartProps) {
  const id = useId();
  const [hover, setHover] = useState<{ index: number; x: number; y: number } | null>(null);

  const padding = { top: 16, right: 16, bottom: 28, left: 48 };
  const innerWidth = 600;
  const innerHeight = height;
  const w = innerWidth;
  const h = innerHeight;

  const allPoints = series.flatMap((s) => s.points);
  if (allPoints.length === 0) {
    return <div className="analytics-empty">No data</div>;
  }
  const allValues = allPoints.flatMap((p) => [p.value, showPrevious ? p.previousValue ?? 0 : 0]);
  const minY = 0;
  const maxY = Math.max(1, ...allValues) * 1.1;
  const xStep = (w - padding.left - padding.right) / Math.max(allPoints.length - 1, 1);
  const yScale = (v: number) => padding.top + (h - padding.top - padding.bottom) * (1 - (v - minY) / (maxY - minY));

  const ticks = 4;
  const yTicks = Array.from({ length: ticks + 1 }, (_, i) => (maxY / ticks) * i);

  const annotationXs = annotations
    .map((a) => {
      const idx = series[0]?.points.findIndex((p) => p.date >= a.annotation_date);
      if (idx < 0) return null;
      const x = padding.left + idx * xStep;
      return { ...a, x };
    })
    .filter((x): x is { id: string; annotation_date: string; title: string; color: string; x: number } => x !== null);

  const xLabels = formatBucket
    ? series[0]?.points.map((p, i) => ({ x: padding.left + i * xStep, label: formatBucket(p.date), idx: i }))
    : [];

  const labelStep = Math.max(1, Math.floor(xLabels.length / 6));
  const visibleLabels = xLabels.filter((_, i) => i % labelStep === 0 || i === xLabels.length - 1);

  return (
    <div className={`analytics-chart ${className ?? ''}`}>
      <svg
        width="100%"
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const target = e.currentTarget;
          const rect = target.getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * w;
          const idx = Math.round((x - padding.left) / xStep);
          if (idx >= 0 && idx < allPoints.length) {
            setHover({ index: idx, x: padding.left + idx * xStep, y: 0 });
          }
        }}
      >
        <defs>
          {series.map((s) => (
            <linearGradient key={s.id} id={`area-${id}-${s.id}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={FILL_MAP[s.color] ?? 'var(--color-plum-300)'} stopOpacity="0.45" />
              <stop offset="100%" stopColor={FILL_MAP[s.color] ?? 'var(--color-plum-300)'} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>

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
              <text
                x={padding.left - 8}
                y={y + 4}
                textAnchor="end"
                className="analytics-axis-label"
              >
                {yFormat(v)}
              </text>
            </g>
          );
        })}

        {series.map((s) => {
          const linePath = s.points
            .map((p, i) => `${i === 0 ? 'M' : 'L'} ${(padding.left + i * xStep).toFixed(2)} ${yScale(p.value).toFixed(2)}`)
            .join(' ');
          const areaPath = `${linePath} L ${(padding.left + (s.points.length - 1) * xStep).toFixed(2)} ${h - padding.bottom} L ${padding.left} ${h - padding.bottom} Z`;
          return (
            <g key={s.id}>
              <path d={areaPath} fill={`url(#area-${id}-${s.id})`} />
              <path
                d={linePath}
                fill="none"
                stroke={COLOR_MAP[s.color] ?? 'var(--color-plum-700)'}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          );
        })}

        {showPrevious && series[0]?.points[0]?.previousValue !== undefined && (
          <path
            d={series[0].points
              .map((p, i) => `${i === 0 ? 'M' : 'L'} ${(padding.left + i * xStep).toFixed(2)} ${yScale(p.previousValue ?? 0).toFixed(2)}`)
              .join(' ')}
            fill="none"
            stroke="var(--color-ink-400)"
            strokeWidth="1.5"
            strokeDasharray="4 3"
            opacity="0.6"
          />
        )}

        {hover && (
          <line
            x1={hover.x}
            x2={hover.x}
            y1={padding.top}
            y2={h - padding.bottom}
            stroke="var(--color-plum-500)"
            strokeWidth="1"
            strokeDasharray="2 2"
            opacity="0.5"
          />
        )}

        {annotationXs.map((a) => (
          <g key={a.id}>
            <line
              x1={a.x}
              x2={a.x}
              y1={padding.top}
              y2={h - padding.bottom}
              stroke={ANNOTATION_COLOR[a.color] ?? 'var(--color-plum-500)'}
              strokeWidth="1"
              strokeDasharray="3 3"
              opacity="0.6"
            />
            <circle
              cx={a.x}
              cy={padding.top + 4}
              r="3"
              fill={ANNOTATION_COLOR[a.color] ?? 'var(--color-plum-500)'}
            />
            <title>{a.title}</title>
          </g>
        ))}

        {visibleLabels.map((l) => (
          <text
            key={l.idx}
            x={l.x}
            y={h - 8}
            textAnchor="middle"
            className="analytics-axis-label"
          >
            {l.label}
          </text>
        ))}
      </svg>
      {hover && series[0]?.points[hover.index] && (
        <div className="analytics-tooltip" style={{ left: `calc(${(hover.x / w) * 100}% )` }}>
          {xLabels[hover.index]?.label && <div className="analytics-tooltip-date">{xLabels[hover.index].label}</div>}
          {series.map((s) => {
            const p = s.points[hover.index];
            if (!p) return null;
            return (
              <div key={s.id} className="analytics-tooltip-row">
                <span className="analytics-tooltip-swatch" style={{ background: COLOR_MAP[s.color] }} />
                <span className="analytics-tooltip-label">{s.label}</span>
                <span className="analytics-tooltip-value">{yFormat(p.value)}</span>
              </div>
            );
          })}
          {showPrevious && series[0]?.points[hover.index]?.previousValue !== undefined && (
            <div className="analytics-tooltip-row previous">
              <span className="analytics-tooltip-swatch" style={{ background: 'var(--color-ink-400)' }} />
              <span className="analytics-tooltip-label">Previous</span>
              <span className="analytics-tooltip-value">{yFormat(series[0].points[hover.index].previousValue ?? 0)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
