type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className, ...rest }: SkeletonProps & Record<string, unknown>) {
  return (
    <div
      className={['animate-pulse rounded-card bg-brand-200/60', className].filter(Boolean).join(' ')}
      {...rest}
    />
  );
}

export function SkeletonLine({ className, ...rest }: SkeletonProps & Record<string, unknown>) {
  return <Skeleton className={['h-4', className].filter(Boolean).join(' ')} {...rest} />;
}

export function SkeletonCard({ className }: SkeletonProps) {
  return (
    <div className={['rounded-card bg-surface p-5 shadow-card', className].filter(Boolean).join(' ')}>
      <Skeleton className="mb-4 h-48 w-full" />
      <SkeletonLine className="mb-2 w-3/4" />
      <SkeletonLine className="mb-2 w-1/2" />
      <SkeletonLine className="w-1/4" />
    </div>
  );
}