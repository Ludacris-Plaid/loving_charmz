import type { ReactNode } from 'react';

type CardProps = {
  children: ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
};

const paddingClasses: Record<string, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6 sm:p-8',
};

export function Card({ children, className, padding = 'md', ...rest }: CardProps & Record<string, unknown>) {
  return (
    <div
      className={[
        'rounded-card border border-brand-400/12 bg-surface shadow-card backdrop-blur',
        paddingClasses[padding],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </div>
  );
}