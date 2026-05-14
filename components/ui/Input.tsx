import type { InputHTMLAttributes } from 'react';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

export function Input({ label, error, className, id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
  const base =
    'w-full rounded-xl border border-brand-400/30 bg-white/70 px-4 py-2.5 text-sm text-brand-800 placeholder:text-brand-600/50 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-300/50 transition';
  const errorClass = error ? 'border-red-400 focus:border-red-500 focus:ring-red-300/50' : '';

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-brand-700">
          {label}
        </label>
      )}
      <input id={inputId} className={[base, errorClass, className].filter(Boolean).join(' ')} {...props} />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}