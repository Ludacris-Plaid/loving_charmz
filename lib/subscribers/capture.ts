import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * System-wide mailing-list capture.
 *
 * Any email a shopper submits anywhere on the site — account signup,
 * checkout contact field, custom-order request — lands in the `subscribers`
 * table so the owner can reach the whole customer base from "Send email".
 *
 * Best-effort by design: a mailing-list write must never break the flow it
 * rides on (signup, payment, order creation all call this). Errors are
 * logged and swallowed; `ignoreDuplicates` makes repeat submissions idempotent.
 */
export async function captureSubscriberEmail(
  email: string | null | undefined,
  source: string,
): Promise<void> {
  const trimmed = (email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(trimmed)) return;

  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from('subscribers')
      .upsert(
        { email: trimmed, source },
        { onConflict: 'email,source', ignoreDuplicates: true }
      );
    if (error) console.error(`[subscribers] capture (${source}) failed:`, error.message);
  } catch (e) {
    console.error(`[subscribers] capture (${source}) threw:`, e);
  }
}
