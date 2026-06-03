import type { HTMLAttributes, ReactNode } from 'react';

type BadgeProps = {
  children: ReactNode;
  variant?: 'mint' | 'plum' | 'soft' | 'success' | 'warning' | 'danger';
  className?: string;
} & HTMLAttributes<HTMLSpanElement>;

const variantClasses: Record<string, string> = {
  mint: 'badge-mint',
  plum: 'badge-plum',
  soft: 'badge-soft',
  success: 'inline-flex items-center gap-1.5 bg-mint-200 text-plum-900 border border-mint-300 px-2.5 py-1 rounded-pill text-xs font-medium',
  warning: 'inline-flex items-center gap-1.5 bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-pill text-xs font-medium',
  danger: 'inline-flex items-center gap-1.5 bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded-pill text-xs font-medium',
};

export function Badge({ children, variant = 'soft', className, ...props }: BadgeProps) {
  return (
    <span
      className={['inline-flex items-center gap-1.5', variantClasses[variant], className].filter(Boolean).join(' ')}
      {...props}
    >
      {children}
    </span>
  );
}
