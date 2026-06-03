'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

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

export async function signup(formData: FormData): Promise<void> {
  const supabase = await createClient();

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    options: {
      data: {
        username: formData.get('username') as string,
      },
    },
  };

  const { data: signUpData, error } = await supabase.auth.signUp(data);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/', 'layout');
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
