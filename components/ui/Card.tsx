import type { HTMLAttributes, ReactNode } from 'react';

type CardProps = {
  children: ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  elevation?: 'flat' | 'card' | 'pop';
  as?: 'div' | 'article' | 'section';
} & HTMLAttributes<HTMLElement>;

const paddingClasses: Record<string, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8 sm:p-10',
};

const elevationClasses: Record<string, string> = {
  flat: 'border border-cream-300 bg-surface',
  card: 'surface-card',
  pop: 'bg-surface border border-cream-300 rounded-card shadow-[0_20px_50px_rgba(93,51,115,0.12)]',
};

export function Card({
  children,
  className,
  padding = 'md',
  elevation = 'card',
  as: Tag = 'div',
  ...props
}: CardProps) {
  return (
    <Tag
      className={[elevationClasses[elevation], paddingClasses[padding], 'motion-base', className].filter(Boolean).join(' ')}
      {...props}
    >
      {children}
    </Tag>
  );
}
