import type { ReactNode } from 'react';

type ContainerProps = {
  children: ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
};

const sizeClasses: Record<string, string> = {
  sm: 'max-w-2xl',
  md: 'max-w-4xl',
  lg: 'max-w-6xl',
  xl: 'max-w-7xl',
};

export function Container({ children, className, size = 'lg', ...rest }: ContainerProps & Record<string, unknown>) {
  return (
    <div
      className={['mx-auto w-full', sizeClasses[size], className].filter(Boolean).join(' ')}
      {...rest}
    >
      {children}
    </div>
  );
}