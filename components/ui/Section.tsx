import type { HTMLAttributes, ReactNode } from 'react';

type SectionProps = {
  children: ReactNode;
  className?: string;
  as?: 'section' | 'div' | 'main';
  background?: 'default' | 'soft' | 'plum' | 'mint';
} & HTMLAttributes<HTMLElement>;

const bgClasses: Record<string, string> = {
  default: '',
  soft: 'bg-cream-100',
  plum: 'bg-plum-700 text-cream-50',
  mint: 'bg-mint-100',
};

export function Section({
  children,
  className,
  as: Tag = 'section',
  background = 'default',
  ...props
}: SectionProps) {
  return (
    <Tag
      className={['py-12 sm:py-16', bgClasses[background], className].filter(Boolean).join(' ')}
      {...props}
    >
      {children}
    </Tag>
  );
}
