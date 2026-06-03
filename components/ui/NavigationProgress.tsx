'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

type Phase = 'idle' | 'loading' | 'done';

const ACTIVE_DELAY = 120;
const DONE_RESET = 380;

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [phase, setPhase] = useState<Phase>('idle');
  const activeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const doneTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPath = useRef<string>('');

  useEffect(() => {
    if (lastPath.current === '' || lastPath.current === pathname) {
      lastPath.current = pathname;
      return;
    }
    lastPath.current = pathname;
    setPhase('done');
    if (doneTimer.current) clearTimeout(doneTimer.current);
    doneTimer.current = setTimeout(() => setPhase('idle'), DONE_RESET);
  }, [pathname]);

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (e.button !== 0) return;
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const anchor = target.closest('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#')) return;
      if (anchor.target && anchor.target !== '_self') return;
      if (anchor.hasAttribute('download')) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname + url.search === window.location.pathname + window.location.search) return;

      if (activeTimer.current) clearTimeout(activeTimer.current);
      activeTimer.current = setTimeout(() => setPhase('loading'), ACTIVE_DELAY);
    }
    function onSubmit() {
      if (activeTimer.current) clearTimeout(activeTimer.current);
      activeTimer.current = setTimeout(() => setPhase('loading'), ACTIVE_DELAY);
    }
    function onPopState() {
      if (activeTimer.current) clearTimeout(activeTimer.current);
      setPhase('loading');
    }
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('submit', onSubmit, true);
    window.addEventListener('popstate', onPopState);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('submit', onSubmit, true);
      window.removeEventListener('popstate', onPopState);
      if (activeTimer.current) clearTimeout(activeTimer.current);
      if (doneTimer.current) clearTimeout(doneTimer.current);
    };
  }, []);

  return (
    <div
      aria-hidden
      className={`nav-progress ${phase === 'loading' ? 'nav-progress--active' : ''} ${phase === 'done' ? 'nav-progress--done' : ''}`}
    >
      <div className="nav-progress__bar" />
    </div>
  );
}
