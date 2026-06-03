import type { HTMLAttributes, ReactNode } from 'react';

type ContainerProps = {
  children: ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
} & HTMLAttributes<HTMLDivElement>;

const sizeClasses: Record<string, string> = {
  sm: 'max-w-2xl',
  md: 'max-w-4xl',
  lg: 'max-w-6xl',
  xl: 'max-w-7xl',
};

export function Container({ children, className, size = 'lg', ...props }: ContainerProps) {
  return (
    <div
      className={['mx-auto w-full px-6 sm:px-10 lg:px-16', sizeClasses[size], className].filter(Boolean).join(' ')}
      {...props}
    >
      {children}
    </div>
  );
}
