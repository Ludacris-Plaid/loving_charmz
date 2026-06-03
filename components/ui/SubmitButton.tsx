'use client';

import { useFormStatus } from 'react-dom';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Spinner } from './Spinner';

type SubmitButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'children'> & {
  children: ReactNode;
  pendingLabel?: string;
  variant?: 'plum' | 'outline' | 'mint' | 'ghost';
};

const VARIANT_CLASS: Record<NonNullable<SubmitButtonProps['variant']>, string> = {
  plum: 'btn-plum',
  outline: 'btn-outline',
  mint: 'btn-mint',
  ghost: 'btn-ghost',
};

export function SubmitButton({
  children,
  pendingLabel,
  className = '',
  variant = 'plum',
  disabled,
  ...rest
}: SubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      aria-busy={pending}
      className={`${VARIANT_CLASS[variant]} ${className}`.trim()}
      {...rest}
    >
      {pending ? (
        <span className="inline-flex items-center gap-2">
          <Spinner size="sm" />
          <span>{pendingLabel ?? 'Working…'}</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
}
