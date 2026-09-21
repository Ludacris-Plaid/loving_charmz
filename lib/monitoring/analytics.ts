import 'server-only';

/**
 * Privacy-friendly visitor analytics — writes to the `page_views` table
 * created in migration 00015.  No cookies, no PII, no third-party scripts.
 * Just path + referrer + device hint + country (from the CF/vercel header).
 *
 * Designed to be called from a Route Handler; never blocks the response.
 */
import { createAdminClient } from '@/lib/supabase/admin';

export async function trackPageView(params: {
  path: string;
  referrer?: string | null;
  userAgent?: string | null;
  country?: string | null;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    const device = guessDevice(params.userAgent);
    await admin.from('page_views').insert({
      path: params.path.slice(0, 500),
      referrer: params.referrer?.slice(0, 500) ?? null,
      country: params.country?.slice(0, 2) ?? null,
      device,
    });
  } catch (e) {
    console.error('[analytics] failed to track page view', e);
  }
}

function guessDevice(ua: string | null | undefined): string {
  if (!ua) return 'other';
  const lower = ua.toLowerCase();
  if (/tablet|ipad/.test(lower)) return 'tablet';
  if (/mobile|android|iphone/.test(lower)) return 'mobile';
  return 'desktop';
}
