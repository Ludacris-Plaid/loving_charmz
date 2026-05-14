import type { ReactNode } from 'react';

type SectionProps = {
  children: ReactNode;
  className?: string;
  as?: 'section' | 'div' | 'main';
};

export function Section({ children, className, as: Tag = 'section', ...rest }: SectionProps & Record<string, unknown>) {
  return (
    <Tag className={['px-6 py-8 sm:px-10 lg:px-16', className].filter(Boolean).join(' ')} {...rest}>
      {children}
    </Tag>
  );
}