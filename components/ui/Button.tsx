import Link from 'next/link';
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonBaseProps = {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
};

type ButtonAsButton = ButtonBaseProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'href'> & { href?: never };
type ButtonAsLink = ButtonBaseProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & { href: string };

export type ButtonProps = ButtonAsButton | ButtonAsLink;

const variantClasses: Record<string, string> = {
  primary:
    'bg-brand-700 text-white shadow-[0_16px_40px_rgba(92,57,47,0.2)] hover:-translate-y-0.5 hover:bg-brand-500 hover:shadow-[0_22px_50px_rgba(92,57,47,0.24)] active:translate-y-0',
  secondary:
    'bg-brand-300 text-brand-700 hover:-translate-y-0.5 hover:bg-brand-400 active:translate-y-0',
  outline:
    'border border-brand-500 text-brand-700 hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_16px_35px_rgba(92,57,47,0.1)] active:translate-y-0',
  ghost: 'text-brand-700 hover:-translate-y-0.5 hover:bg-brand-100 active:translate-y-0',
};

const sizeClasses: Record<string, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-6 py-3 text-sm',
};

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  className,
  ...props
}: ButtonProps) {
  const base =
    'motion-transition inline-flex items-center justify-center rounded-full font-semibold will-change-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed disabled:opacity-50';
  const classes = [base, variantClasses[variant], sizeClasses[size], className]
    .filter(Boolean)
    .join(' ');

  if ('href' in props && props.href) {
    const { href, ...anchorProps } = props as ButtonAsLink;
    return (
      <Link href={href} className={classes} {...anchorProps}>
        {children}
      </Link>
    );
  }

  const { ...buttonProps } = props as ButtonAsButton;
  return (
    <button className={classes} {...buttonProps}>
      {children}
    </button>
  );
}