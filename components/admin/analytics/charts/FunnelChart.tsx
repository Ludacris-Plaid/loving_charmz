'use client';

type FunnelStep = {
  label: string;
  value: number;
  color?: string;
};

type FunnelChartProps = {
  steps: FunnelStep[];
  className?: string;
  formatValue?: (v: number) => string;
};

const DEFAULT_COLORS = [
  'var(--color-plum-700)',
  'var(--color-plum-500)',
  'var(--color-mint-500)',
  'var(--color-mint-300)',
];

export function FunnelChart({ steps, className, formatValue = (v) => v.toLocaleString('en-US') }: FunnelChartProps) {
  if (steps.length === 0) return <div className="analytics-empty">No data</div>;
  const max = Math.max(1, ...steps.map((s) => s.value));

  return (
    <div className={`analytics-funnel ${className ?? ''}`}>
      {steps.map((step, i) => {
        const pct = step.value / max;
        const prevValue = i > 0 ? steps[i - 1].value : step.value;
        const conversion = i > 0 && prevValue > 0 ? (step.value / prevValue) * 100 : 100;
        return (
          <div key={step.label} className="analytics-funnel-step">
            <div className="analytics-funnel-header">
              <span className="analytics-funnel-label">{step.label}</span>
              <span className="analytics-funnel-value">{formatValue(step.value)}</span>
            </div>
            <div className="analytics-funnel-track">
              <div
                className="analytics-funnel-fill"
                style={{
                  width: `${pct * 100}%`,
                  background: step.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length],
                }}
              />
            </div>
            {i > 0 && (
              <div className="analytics-funnel-conversion">
                {conversion >= 100 ? '↑' : '↓'} {conversion.toFixed(1)}% from previous
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
