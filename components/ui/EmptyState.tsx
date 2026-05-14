import type { ReactNode } from 'react';

type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
};

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      {icon && <div className="mb-4 text-brand-500">{icon}</div>}
      <h3 className="text-lg font-semibold text-brand-700">{title}</h3>
      {description && <p className="mt-2 max-w-md text-sm text-brand-600">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}