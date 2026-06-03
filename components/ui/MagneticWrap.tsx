'use client';

import { useRef, type CSSProperties, type MouseEvent, type ReactNode } from 'react';

type MagneticWrapProps = {
  children: ReactNode;
  className?: string;
  strength?: number;
  style?: CSSProperties;
};

export function MagneticWrap({
  children,
  className = '',
  strength = 8,
  style,
}: MagneticWrapProps) {
  const ref = useRef<HTMLDivElement>(null);

  function onMove(e: MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const dx = ((e.clientX - r.left - r.width / 2) / r.width) * strength;
    const dy = ((e.clientY - r.top - r.height / 2) / r.height) * strength;
    el.style.setProperty('--mx', `${dx.toFixed(2)}px`);
    el.style.setProperty('--my', `${dy.toFixed(2)}px`);
  }

  function onLeave() {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty('--mx', '0px');
    el.style.setProperty('--my', '0px');
  }

  return (
    <div
      ref={ref}
      className={className}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{
        display: 'inline-block',
        transform: 'translate(var(--mx, 0px), var(--my, 0px))',
        transition: 'transform 360ms cubic-bezier(0.2, 0.7, 0.2, 1)',
        willChange: 'transform',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
