import 'server-only';

/**
 * Self-hosted error monitoring — writes to the `error_events` table created
 * in migration 00015. No third-party dependency, no PII stored.
 *
 * Env-gated: only active when `NEXT_PUBLIC_SUPABASE_URL` is set (i.e., not
 * during local dev with no DB).  Errors are fire-and-forget — they never
 * block the request or leak back to the client.
 */
import { createAdminClient } from '@/lib/supabase/admin';

export async function logErrorEvent(params: {
  source: 'server' | 'client';
  message: string;
  stack?: string | null;
  digest?: string | null;
  path?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from('error_events').insert({
      source: params.source,
      message: params.message.slice(0, 2000),
      stack: params.stack?.slice(0, 4000) ?? null,
      digest: params.digest ?? null,
      path: params.path ?? null,
      user_agent: params.userAgent?.slice(0, 500) ?? null,
    });
  } catch (e) {
    // Swallow — monitoring must never break the app
    console.error('[monitoring] failed to log error event', e);
  }
}
