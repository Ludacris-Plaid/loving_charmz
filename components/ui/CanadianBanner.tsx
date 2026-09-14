'use client';

import { useState, useEffect } from 'react';

export function CanadianBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 150);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  return (
    <div className="relative overflow-hidden border-b border-plum-950/40 bg-gradient-to-r from-plum-900 via-plum-800 to-plum-900 py-1.5 text-cream-100">
      {/* slow mint shimmer sweep — movement without noise */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-1/3 animate-[shimmer_7s_linear_infinite] bg-gradient-to-r from-transparent via-mint-300/15 to-transparent"
      />
      <div className="ticker-track flex items-center gap-12 whitespace-nowrap">
        {Array.from({ length: 8 }).map((_, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-3 text-xs font-medium tracking-wide sm:text-sm"
          >
            <span className="font-display font-semibold text-cream-100">
              Proudly Canadian
            </span>
            <svg
              width="20"
              height="13"
              viewBox="0 0 28 18"
              fill="none"
              className="shrink-0"
              aria-hidden
            >
              <rect x="0" y="0" width="7" height="18" fill="#D64550" />
              <rect x="21" y="0" width="7" height="18" fill="#D64550" />
              <rect x="7" y="0" width="14" height="18" fill="#FBF7F0" />
              <path
                d="M14 3 L15.2 6.5 L18.5 6.5 L15.8 8.8 L17 12.2 L14 10 L11 12.2 L12.2 8.8 L9.5 6.5 L12.8 6.5 Z"
                fill="#D64550"
              />
              <rect x="13.5" y="12" width="1" height="3" fill="#D64550" />
            </svg>
            <span className="text-mint-200">
              Free shipping on orders over $50 CAD
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
