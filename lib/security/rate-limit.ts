import 'server-only';

import { headers } from 'next/headers';

import { createAdminClient } from '@/lib/supabase/admin';

/**
 * DB-backed fixed-window rate limiting for public write actions.
 *
 * Serverless instances share no memory, so the counter lives in Postgres
 * (`rate_limits`, migration 00012). Each call upserts the current one-minute
 * bucket for the key and reads back the count in the same statement, making
 * the check race-safe under concurrent requests.
 */

export type RateLimitResult = {
  allowed: boolean;
  /** Seconds until the current window rolls over (only meaningful when blocked). */
  retryAfterSeconds: number;
};

export type RateLimitOptions = {
  /** Logical name of the action, namespacing the counter (e.g. 'discount'). */
  action: string;
  /** Max attempts allowed inside the window. */
  limit: number;
  /** Window length in seconds. */
  windowSeconds: number;
};

/** Best-effort client IP from Vercel's proxy headers. */
export async function getClientIp(): Promise<string> {
  const headerList = await headers();
  const forwarded = headerList.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0].trim();
    if (first) return first;
  }
  return headerList.get('x-real-ip') ?? 'unknown';
}

/**
 * Count one attempt against `${action}:${ip}` and report whether it fits
 * under the limit. Counts are incremented even for requests that will be
 * rejected, so bursts of retries exhaust the window and get throttled.
 */
export async function checkRateLimit(options: RateLimitOptions): Promise<RateLimitResult> {
  const ip = await getClientIp();
  const key = `${options.action}:${ip}`;
  const admin = createAdminClient();

  let allowed = true;
  try {
    const { data, error } = await admin.rpc('consume_rate_limit', {
      p_key: key,
      p_limit: options.limit,
      p_window_seconds: options.windowSeconds,
    });

    if (error) {
      console.error('[rate-limit] rpc failed, failing open', error.message);
    } else {
      allowed = Number(data) > 0;
    }
  } catch (error) {
    // Never let limiter infrastructure break the underlying feature —
    // fail open and let application-level validation do its job.
    console.error('[rate-limit] failed, failing open', error);
  }

  return {
    allowed,
    retryAfterSeconds: allowed ? 0 : options.windowSeconds,
  };
}
