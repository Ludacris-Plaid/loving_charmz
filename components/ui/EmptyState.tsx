import type { HTMLAttributes, ReactNode } from 'react';

type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
} & HTMLAttributes<HTMLDivElement>;

export function EmptyState({ icon, title, description, action, className, ...props }: EmptyStateProps) {
  return (
    <div
      className={['flex flex-col items-center justify-center px-6 py-16 text-center surface-soft', className].filter(Boolean).join(' ')}
      {...props}
    >
      {icon && <div className="mb-4 text-plum-600 text-3xl">{icon}</div>}
      <h3 className="text-lg font-semibold text-plum-800">{title}</h3>
      {description && <p className="mt-2 max-w-md text-sm text-ink-600">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
