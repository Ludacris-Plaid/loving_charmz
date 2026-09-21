'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * The client side of the self-hosted monitoring system.
 *
 * 1. Page-view beacon — POSTs to /api/monitoring/views on every route change
 *    (sendBeacon so it never delays navigation). Feeds the traffic stats.
 * 2. Window error listener — reports unhandled client exceptions to
 *    /api/monitoring/errors. React render errors are additionally caught by
 *    the app's error boundaries; this catches everything else (unhandled
 *    promise rejections, event-handler throws).
 *
 * Both are fire-and-forget: monitoring must never affect the shopper.
 * Supabase errors are already captured server-side by instrumentation.ts.
 */
export function MonitoringBeacon() {
  const pathname = usePathname();

  // Page views
  useEffect(() => {
    if (!pathname || pathname.startsWith('/admin')) return;
    const payload = JSON.stringify({ path: pathname });
    try {
      if (typeof navigator.sendBeacon === 'function') {
        navigator.sendBeacon('/api/monitoring/views', new Blob([payload], { type: 'application/json' }));
      } else {
        void fetch('/api/monitoring/views', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        });
      }
    } catch {
      // Never let analytics break the page.
    }
  }, [pathname]);

  // Unhandled client errors
  useEffect(() => {
    const report = (message: string, stack?: string) => {
      try {
        const payload = JSON.stringify({
          message,
          stack,
          path: window.location.pathname,
        });
        void fetch('/api/monitoring/errors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        });
      } catch {
        // Swallow.
      }
    };

    const onError = (event: ErrorEvent) => {
      if (event.error) {
        report(event.error.message || event.message, event.error.stack);
      } else {
        report(event.message);
      }
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      report(
        reason instanceof Error ? reason.message : String(reason ?? 'Unhandled promise rejection'),
        reason instanceof Error ? reason.stack : undefined,
      );
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  return null;
}
