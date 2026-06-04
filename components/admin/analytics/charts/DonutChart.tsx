'use client';

import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';

type DonutSlice = {
  label: string;
  value: number;
  color: string;
  href?: string;
};

type DonutChartProps = {
  data: DonutSlice[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
  className?: string;
  onSelect?: (label: string | null) => void;
  formatValue?: (v: number) => string;
};

const PALETTE = [
  'var(--color-plum-700)',
  'var(--color-plum-500)',
  'var(--color-mint-500)',
  'var(--color-mint-300)',
  'var(--color-plum-300)',
  'var(--color-plum-200)',
  'var(--color-mint-200)',
  'var(--color-ink-300)',
];

export function DonutChart({
  data,
  size = 200,
  thickness = 28,
  centerLabel,
  centerValue,
  className,
  onSelect,
  formatValue = (v) => v.toLocaleString('en-US'),
}: DonutChartProps) {
  const router = useRouter();
  const id = useId();
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) {
    return <div className="analytics-empty">No data</div>;
  }
  const radius = size / 2 - thickness / 2 - 2;
  const circumference = 2 * Math.PI * radius;

  const segments = (() => {
    const arr: Array<{ d: DonutSlice; i: number; dash: number; gap: number; offset: number; color: string; isActive: boolean; pct: number }> = [];
    let cumulative = 0;
    for (let i = 0; i < data.length; i++) {
      const d = data[i];
      const pct = d.value / total;
      const dash = pct * circumference;
      const gap = circumference - dash;
      const offset = -cumulative;
      cumulative += dash;
      const color = d.color || PALETTE[i % PALETTE.length];
      const isActive = hoverIdx === null || hoverIdx === i;
      arr.push({ d, i, dash, gap, offset, color, isActive, pct });
    }
    return arr;
  })();

  return (
    <div className={`analytics-donut ${className ?? ''}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-cream-200)"
          strokeWidth={thickness}
        />
        {segments.map(({ d, i, dash, gap, offset, color, isActive, pct }) => {
          return (
            <g
              key={d.label}
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
              onClick={() => {
                if (onSelect) onSelect(hoverIdx === i ? null : d.label);
                else if (d.href) router.push(d.href);
              }}
              className="analytics-donut-slice"
              opacity={isActive ? 1 : 0.4}
            >
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={color}
                strokeWidth={hoverIdx === i ? thickness + 3 : thickness}
                strokeDasharray={`${dash} ${gap}`}
                strokeDashoffset={offset}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                className="analytics-donut-arc"
                style={{ transition: 'stroke-width 200ms var(--motion-ease-smooth)' }}
              >
                <title>{`${d.label}: ${formatValue(d.value)} (${(pct * 100).toFixed(1)}%)`}</title>
              </circle>
            </g>
          );
        })}
        {centerLabel && (
          <text
            x={size / 2}
            y={size / 2 - 6}
            textAnchor="middle"
            className="analytics-donut-center-label"
          >
            {centerLabel}
          </text>
        )}
        {centerValue && (
          <text
            x={size / 2}
            y={size / 2 + 16}
            textAnchor="middle"
            className="analytics-donut-center-value"
          >
            {centerValue}
          </text>
        )}
      </svg>
    </div>
  );
}
