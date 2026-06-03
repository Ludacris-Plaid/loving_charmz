'use client';

import { useEffect } from 'react';

export function HeaderScroll() {
  useEffect(() => {
    const header = document.querySelector<HTMLElement>('header[data-site-header]');
    if (!header) return;

    const SCROLL_THRESHOLD = 60;

    function onScroll() {
      if (!header) return;
      if (window.scrollY > SCROLL_THRESHOLD) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    }

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return null;
}
