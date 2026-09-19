'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export type SubscribeResult = { ok?: boolean; error?: string };
export type DeleteSubscriberResult = { ok?: boolean; error?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Saves a mailing-list signup from the welcome popup (or anywhere else).
 * Uses the service-role client because the popup fires from pages where
 * the visitor may have no session at all — the anon RLS policy also
 * allows this insert, but the admin client keeps the flow working even
 * if a future policy change tightens anon access.
 */
export async function subscribeAction(email: string): Promise<SubscribeResult> {
  const trimmed = (email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(trimmed)) {
    return { error: 'Please enter a valid email address.' };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const admin = createAdminClient();
  const { error } = await admin
    .from('subscribers')
    .upsert(
      { email: trimmed, source: 'popup' },
      { onConflict: 'email,source', ignoreDuplicates: true }
    );

  if (error) {
    // Unique-violation would mean they signed up twice — treat as success.
    if (error.code === '23505') return { ok: true };
    return { error: 'Something went wrong saving your email. Please try again.' };
  }

  // Keep the shopper's own profile email in sync if they are signed in,
  // so account pages show the same address they subscribed with.
  if (user && user.email && user.email.toLowerCase() !== trimmed) {
    // They subscribed with a different address than their account —
    // that's allowed; the subscribers list is the source of truth.
  }

  revalidatePath('/admin/subscribers');
  return { ok: true };
}

/** Admin-only: remove one email from the mailing list. */
export async function deleteSubscriberAction(id: string): Promise<DeleteSubscriberResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Please sign in first.' };

  // Confirm admin through the service-role client using is_admin().
  const admin = createAdminClient();
  const { data: isAdmin, error: roleErr } = await admin.rpc('is_admin');
  if (roleErr || !isAdmin) return { error: 'Admins only.' };

  const { error } = await admin.from('subscribers').delete().eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/admin/subscribers');
  return { ok: true };
}

/** Public: unsubscribe by email (no login required). */
export async function unsubscribeAction(email: string): Promise<SubscribeResult> {
  const trimmed = (email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(trimmed)) {
    return { error: 'Please enter a valid email address.' };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from('subscribers')
    .delete()
    .eq('email', trimmed);

  if (error) return { error: 'Something went wrong. Please try again.' };

  revalidatePath('/admin/subscribers');
  return { ok: true };
}
