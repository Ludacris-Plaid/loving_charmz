import type { HTMLAttributes } from 'react';

type SkeletonProps = {
  className?: string;
} & HTMLAttributes<HTMLDivElement>;

export function Skeleton({ className, ...props }: SkeletonProps) {
  return <div className={['skeleton', className].filter(Boolean).join(' ')} {...props} />;
}

export function SkeletonLine({ className, ...props }: SkeletonProps) {
  return <Skeleton className={['h-4', className].filter(Boolean).join(' ')} {...props} />;
}

export function SkeletonCard({ className, ...props }: SkeletonProps) {
  return (
    <div className={['surface-card p-5', className].filter(Boolean).join(' ')} {...props}>
      <Skeleton className="mb-4 h-44 w-full" />
      <SkeletonLine className="mb-2 w-3/4" />
      <SkeletonLine className="mb-2 w-1/2" />
      <SkeletonLine className="w-1/4" />
    </div>
  );
}
