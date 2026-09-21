'use client';

import { useEffect } from 'react';

/**
 * Injects structured data (JSON-LD) into the document <head>.
 * Client-side injection avoids React Server Component streaming issues
 * where <script type="application/ld+json"> tags get dropped.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  useEffect(() => {
    const id = 'product-jsonld';
    // Remove any existing tag (e.g. from a hot-reload or re-render)
    const existing = document.getElementById(id);
    if (existing) existing.remove();

    const script = document.createElement('script');
    script.id = id;
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(data);
    document.head.appendChild(script);

    return () => {
      const el = document.getElementById(id);
      if (el) el.remove();
    };
  }, [data]);

  return null;
}
