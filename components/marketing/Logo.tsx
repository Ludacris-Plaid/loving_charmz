import Link from 'next/link';

type LogoProps = {
  href?: string;
  size?: 'sm' | 'md' | 'lg';
  as?: 'link' | 'span';
  className?: string;
  ariaLabel?: string;
};

const SIZE_CLASS: Record<NonNullable<LogoProps['size']>, string> = {
  sm: 'logo--sm',
  md: 'logo--md',
  lg: 'logo--lg',
};

export function Logo({
  href = '/',
  size = 'md',
  as = 'link',
  className = '',
  ariaLabel = 'Loving Charmz',
}: LogoProps) {
  const inner = (
    <span className="logo__text">
      <span className="logo__loving">Loving</span>
      <span className="logo__charmz">
        Charm<span className="logo__z">z</span>
      </span>
    </span>
  );

  const classes = `logo ${SIZE_CLASS[size]} ${className}`.trim();

  if (as === 'span') {
    return <span className={classes} aria-label={ariaLabel}>{inner}</span>;
  }

  return (
    <Link href={href} className={classes} aria-label={ariaLabel}>
      {inner}
    </Link>
  );
}
