import Link from 'next/link';
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonBaseProps = {
  variant?: 'plum' | 'outline' | 'mint' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
  fullWidth?: boolean;
};

type ButtonAsButton = ButtonBaseProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'href'> & { href?: never };
type ButtonAsLink = ButtonBaseProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & { href: string };

export type ButtonProps = ButtonAsButton | ButtonAsLink;

const variantClasses: Record<string, string> = {
  plum: 'btn-plum border border-plum-700 disabled:opacity-50',
  outline: 'btn-outline border border-plum-700 disabled:opacity-50',
  mint: 'btn-mint border border-mint-300 disabled:opacity-50',
  ghost: 'btn-ghost border border-transparent disabled:opacity-50',
  danger: 'inline-flex items-center justify-center bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 font-semibold rounded-pill transition motion-base disabled:opacity-50',
};

const sizeClasses: Record<string, string> = {
  sm: 'px-3.5 py-1.5 text-xs',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-7 py-3 text-sm',
};

export function Button({
  variant = 'plum',
  size = 'md',
  fullWidth = false,
  children,
  className,
  ...props
}: ButtonProps) {
  const classes = [
    variantClasses[variant],
    sizeClasses[size],
    fullWidth ? 'w-full' : '',
    className,
  ]
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

  const buttonProps = props as ButtonAsButton;
  return (
    <button className={classes} {...buttonProps}>
      {children}
    </button>
  );
}
