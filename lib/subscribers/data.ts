import 'server-only';
import { createClient } from '@/lib/supabase/server';

export type Subscriber = {
  id: string;
  email: string;
  source: string;
  created_at: string;
};

/**
 * Mailing-list signups, newest first.
 *
 * Read with the REQUEST-scoped client on purpose: RLS ("Admins read
 * subscribers", migration 00010) decides who sees rows. Pages in the admin
 * area render in parallel with the layout guard, so the RLS policy — not
 * just the UI guard — is what keeps this list private.
 */
export async function getSubscribers(limit = 5000): Promise<Subscriber[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('subscribers')
    .select('id, email, source, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data || [];
}
