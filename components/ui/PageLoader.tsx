import { Spinner } from './Spinner';

export function PageLoader({ message = 'Loading' }: { message?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-6"
    >
      <Spinner size="lg" label={message} />
      <p className="text-xs font-medium uppercase tracking-[0.3em] text-ink-500">
        {message}
      </p>
    </div>
  );
}
