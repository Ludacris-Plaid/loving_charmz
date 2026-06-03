type SpinnerProps = {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
};

const SIZE_CLASS = {
  sm: 'spinner-mark--sm',
  md: '',
  lg: '',
} as const;

export function Spinner({ size = 'md', label, className = '' }: SpinnerProps) {
  const labelId = label ? 'spinner-label' : undefined;
  return (
    <span
      role="status"
      aria-live="polite"
      aria-labelledby={labelId}
      className={`spinner-mark ${SIZE_CLASS[size]} ${className}`.trim()}
    >
      <span className="sr-only" id={labelId}>
        {label ?? 'Loading'}
      </span>
    </span>
  );
}
