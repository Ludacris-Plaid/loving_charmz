import type { ReactNode } from 'react';

type BadgeProps = {
  children: ReactNode;
  variant?: 'default' | 'brand' | 'success' | 'warning';
  className?: string;
};

const variantClasses: Record<string, string> = {
  default: 'bg-brand-300 text-brand-700',
  brand: 'bg-brand-500 text-white',
  success: 'bg-green-100 text-green-800',
  warning: 'bg-amber-100 text-amber-800',
};

export function Badge({ children, variant = 'default', className, ...rest }: BadgeProps & Record<string, unknown>) {
  return (
    <span
      className={[
        'motion-transition inline-flex items-center gap-2 rounded-pill border border-white/40 px-3 py-1 text-xs font-medium shadow-[0_10px_30px_rgba(92,57,47,0.08)]',
        variantClasses[variant],
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </span>
  );
}