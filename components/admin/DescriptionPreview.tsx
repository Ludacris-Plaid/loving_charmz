'use client';

import { useMemo } from 'react';

import { parseDescription } from '@/lib/shop/description';

type Props = {
  /** The live textarea value from the parent's state. */
  value: string;
};

/**
 * Live preview of how a product description renders on the storefront
 * (mirrors the presentation in components/shop/ProductDetailClient.tsx):
 * one paragraph per narrative line, and "Label: value" lines — plus short
 * unpunctuated lines after them — as a bulleted spec list.
 *
 * Purely presentational: the parent keeps the textarea's value in state and
 * re-renders this on every keystroke. The parsing itself is the shared,
 * unit-tested `parseDescription`, so the preview can never drift from what
 * shoppers actually see.
 */
export function DescriptionPreview({ value }: Props) {
  const parsed = useMemo(() => parseDescription(value), [value]);
  const isEmpty = parsed.paragraphs.length === 0 && parsed.specs.length === 0;

  return (
    <div
      aria-live="polite"
      aria-label="Preview of how this description will appear on the product page"
      className="rounded-md border border-cream-300 bg-white p-5"
    >
      {isEmpty ? (
        <p className="text-sm text-ink-400 italic">
          Start typing above — paragraphs and spec bullets will appear here exactly as
          shoppers will see them.
        </p>
      ) : (
        <div className="space-y-3">
          {parsed.paragraphs.map((para, i) => (
            <p key={i} className="text-sm text-ink-700 leading-relaxed">{para}</p>
          ))}
          {parsed.specs.length > 0 && (
            <ul className="space-y-1.5 text-sm text-ink-700">
              {parsed.specs.map((spec, i) => (
                <li key={i} className="flex items-baseline gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-plum-500" aria-hidden />
                  <span>
                    {spec.label && <strong className="font-semibold text-plum-800">{spec.label}: </strong>}
                    {spec.value}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
