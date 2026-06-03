'use client';

import type { Kpi } from '@/lib/admin/analytics/types';
import { Sparkline } from './Sparkline';
import { formatDelta } from '@/lib/admin/analytics/format';

type KpiCardProps = {
  kpi: Kpi;
  accent?: 'plum' | 'mint';
  href?: string;
  hint?: string;
};

export function KpiCard({ kpi, accent = 'plum', href, hint }: KpiCardProps) {
  const delta = kpi.delta;
  const isPositive = delta.direction === 'up';
  const isNegative = delta.direction === 'down';
  const noPrev = delta.previous === 0;
  const colorMap = {
    plum: { text: 'plum-gradient-text', line: 'var(--color-plum-700)', fill: 'var(--color-plum-300)' },
    mint: { text: 'mint-gradient-text', line: 'var(--color-mint-500)', fill: 'var(--color-mint-300)' },
  } as const;
  const c = colorMap[accent];
  const inner = (
    <div className={`kpi-card surface-card inner-highlight motion-base ${href ? 'hover-lift' : ''}`}>
      <div className="kpi-card-header">
        <p className="kpi-card-label">{kpi.label}</p>
        {kpi.sparkline && kpi.sparkline.length > 1 && (
          <Sparkline values={kpi.sparkline} width={72} height={22} color={c.line} fill={c.fill} />
        )}
      </div>
      <p className={`kpi-card-value ${c.text}`}>{kpi.formatted}</p>
      <div className="kpi-card-footer">
        {!noPrev ? (
          <span
            className={`kpi-delta ${isPositive ? 'kpi-delta-up' : isNegative ? 'kpi-delta-down' : 'kpi-delta-flat'}`}
          >
            <span aria-hidden>{isPositive ? '↑' : isNegative ? '↓' : '→'}</span>
            {formatDelta(delta.deltaPct)}
          </span>
        ) : (
          <span className="kpi-delta kpi-delta-flat">— no prior</span>
        )}
        {hint && <span className="kpi-hint">{hint}</span>}
      </div>
    </div>
  );
  if (href) {
    return (
      <a href={href} className="kpi-card-link">
        {inner}
      </a>
    );
  }
  return inner;
}
