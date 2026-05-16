'use client';

import { useEffect, useRef, useState } from 'react';

type RevealProps = {
  children: React.ReactNode;
  className?: string;
  delayClassName?: string;
  as?: 'div' | 'section';
};

export function Reveal({ children, className, delayClassName, as = 'div' }: RevealProps) {
  const [visible, setVisible] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });
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
      {
        threshold: 0.16,
        rootMargin: '0px 0px -10% 0px',
      },
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [visible]);

  const Component = as;

  return (
    <Component
      ref={ref as never}
      data-visible={visible}
      className={['reveal', delayClassName, className].filter(Boolean).join(' ')}
    >
      {children}
    </Component>
  );
}
