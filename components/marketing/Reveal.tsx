'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

type RevealProps = {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'article';
};

function prefersReducedMotion() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function Reveal({ children, className, as = 'div' }: RevealProps) {
  const [visible, setVisible] = useState<boolean>(() => prefersReducedMotion());
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (visible) return;
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [visible]);

  const Tag = as;
  return (
    <Tag
      ref={ref as never}
      data-visible={visible}
      className={['reveal-scroll', visible ? 'visible' : '', className].filter(Boolean).join(' ')}
    >
      {children}
    </Tag>
  );
}
