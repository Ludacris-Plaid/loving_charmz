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
        'inline-flex items-center rounded-pill px-3 py-1 text-xs font-medium',
        variantClasses[variant],
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </span>
  );
}