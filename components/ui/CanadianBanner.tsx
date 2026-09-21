'use client';

import { useState, useEffect } from 'react';

import { TICKER_THEMES, type TickerConfig } from '@/lib/ticker-config';

type Props = {
  config: TickerConfig;
};

/**
 * The scrolling ticker under the header.
 *
 * Content is owned by the admin Content tab (content_blocks row `ticker`):
 * one or more messages — emojis welcome — plus a colour theme drawn from the
 * site palette. "Proudly Canadian" with the maple-leaf flag always leads the
 * rotation; admin messages follow. Each message repeats 4× so the seamless
 * loop stays full-width on large screens.
 */
export function CanadianBanner({ config }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 150);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  const theme = TICKER_THEMES[config.theme] ?? TICKER_THEMES.plum;
  const items = ['Proudly Canadian', ...config.messages];
  // 4 copies of the sequence: enough for a seamless -50% translate loop at
  // any content width up to very large screens.
  const repetitions = 4;

  return (
    <div className={`relative overflow-hidden border-b py-1.5 ${theme.classes}`}>
      {/* slow shimmer sweep — movement without noise */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-1/3 animate-[shimmer_7s_linear_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent"
      />
      <div className="ticker-track flex items-center gap-12 whitespace-nowrap">
        {Array.from({ length: repetitions }).flatMap((_, rep) =>
          items.map((message, i) => (
            <span
              key={`${rep}-${i}`}
              className="inline-flex items-center gap-3 text-xs font-medium tracking-wide sm:text-sm"
            >
              {i === 0 ? (
                <>
                  <span className="font-handwriting text-lg font-semibold leading-none sm:text-xl">
                    {message}
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
                </>
              ) : (
                <span>{message}</span>
              )}
            </span>
          )),
        )}
      </div>
    </div>
  );
}
