'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { mergeGuestCartIntoMember } from '@/lib/cart/guest';
import { SITE_URL } from '@/lib/site';

function safeNext(value: FormDataEntryValue | null) {
  if (typeof value !== 'string') return null;
  if (!value.startsWith('/') || value.startsWith('//')) return null;
  return value;
}

async function isAdmin(userId: string): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();
    return Boolean(data);
  } catch {
    return false;
  }
}

function landingFor(userId: string, isAdminUser: boolean) {
  return isAdminUser ? '/admin' : '/account';
}

/**
 * Maps raw Supabase auth errors onto shopper-friendly copy.
 *
 * Server-action errors are masked in production builds ("An error occurred in
 * the Server Components render… digest …"), so the raw provider message would
 * never reach the shopper anyway — throwing here only ever produced a generic
 * error page. Returning the friendly message keeps the shopper on the form.
 */
function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('already registered') || m.includes('already exists')) {
    return 'An account with that email already exists. Try signing in instead.';
  }
  if (m.includes('password') && (m.includes('at least') || m.includes('should be') || m.includes('weak') || m.includes('short'))) {
    return 'That password is too weak — please use at least 8 characters.';
  }
  if (m.includes('database error saving new user')) {
    return 'That username may already be taken — please choose another and try again.';
  }
  if (m.includes('rate limit') || m.includes('too many')) {
    return 'Too many attempts — please wait a minute and try again.';
  }
  if (m.includes('valid email') || m.includes('invalid email')) {
    return 'Please enter a valid email address.';
  }
  return 'We could not create your account. Please check your details and try again.';
}

export async function signup(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient();

  const email = ((formData.get('email') as string) || '').trim().toLowerCase();
  const password = (formData.get('password') as string) || '';
  const username = ((formData.get('username') as string) || '').trim();

  if (!email || !password || !username) {
    return { error: 'Please fill in every field to create your account.' };
  }

  // Duplicate usernames only fail deep inside the profile-creation trigger as
  // an opaque "Database error saving new user" — check up front so the shopper
  // gets a clear, actionable message instead.
  const { data: takenUsername } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .maybeSingle();
  if (takenUsername) {
    return { error: 'That username is already taken — please choose another.' };
  }

  const { data: signUpData, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username },
    },
  });

  if (error) {
    console.error('[signup]', error.message);
    return { error: friendlyAuthError(error.message) };
  }

  revalidatePath('/', 'layout');
  // Any guest cart built before signing up is folded into the new account.
  try {
    const userId = signUpData.user?.id;
    if (userId) await mergeGuestCartIntoMember(userId);
  } catch (e) {
    console.error('[signup] guest cart merge failed', e);
  }
  const next = safeNext(formData.get('next'));
  if (next) redirect(next);
  const userId = signUpData.user?.id;
  const isAdminUser = userId ? await isAdmin(userId) : false;
  redirect(landingFor(userId ?? '', isAdminUser));
}

export async function login(formData: FormData): Promise<void> {
  const supabase = await createClient();

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  };

  const { data: signInData, error } = await supabase.auth.signInWithPassword(data);

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}${formData.get('next') ? `&next=${encodeURIComponent(formData.get('next') as string)}` : ''}`);
  }

  revalidatePath('/', 'layout');
  // Absorb the guest cart built while signed out into the member cart.
  const mergedUserId = signInData.user?.id ?? null;
  if (mergedUserId) {
    try {
      await mergeGuestCartIntoMember(mergedUserId);
    } catch (e) {
      console.error('[login] guest cart merge failed', e);
    }
  }
  const next = safeNext(formData.get('next'));
  if (next) redirect(next);
  const userId = signInData.user?.id ?? '';
  const isAdminUser = userId ? await isAdmin(userId) : false;
  redirect(landingFor(userId, isAdminUser));
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/');
}

/* ------------------------------------------------------------------ */
/*  Password reset                                                      */
/* ------------------------------------------------------------------ */

type ForgotPasswordResult = { error?: string; message?: string };

export async function forgotPasswordAction(formData: FormData): Promise<ForgotPasswordResult> {
  const email = (formData.get('email') as string || '').trim().toLowerCase();
  if (!email) return { error: 'Please enter your email address.' };

  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || SITE_URL;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/reset-password`,
  });

  if (error) {
    // Always show success to prevent email enumeration
    console.error('[forgotPasswordAction]', error.message);
  }

  // Always show success — prevents email enumeration
  return {
    message: 'If an account exists with that email, you\'ll receive a password reset link shortly.',
  };
}

export async function resetPasswordAction(
  accessToken: string,
  newPassword: string,
): Promise<ForgotPasswordResult> {
  if (!accessToken) return { error: 'Invalid reset link.' };
  if (newPassword.length < 6) return { error: 'Password must be at least 6 characters.' };

  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    console.error('[resetPasswordAction]', error.message);
    return { error: 'Failed to reset password. The link may have expired — please request a new one.' };
  }

  // Sign in and redirect to login
  revalidatePath('/', 'layout');
  redirect('/login?error=Password%20updated%20successfully.%20Please%20sign%20in.');
}
