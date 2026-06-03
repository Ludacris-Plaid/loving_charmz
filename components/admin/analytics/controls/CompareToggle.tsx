'use client';

type CompareToggleProps = {
  compare: boolean;
  onChange: (next: boolean) => void;
  className?: string;
};

export function CompareToggle({ compare, onChange, className }: CompareToggleProps) {
  return (
    <button
      type="button"
      className={`analytics-control ${className ?? ''}`}
      aria-pressed={compare}
      onClick={() => onChange(!compare)}
    >
      <span aria-hidden>{compare ? '✓' : '○'}</span>
      Compare to previous
    </button>
  );
}
