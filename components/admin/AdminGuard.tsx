import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ReactNode } from 'react';

type AdminGuardProps = {
  children: ReactNode;
};

export type AdminSession = {
  userId: string;
  email: string | null;
  isAdmin: boolean;
};

export async function AdminGuard({ children }: AdminGuardProps) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/admin');
  }

  const admin = createAdminClient();
  const { data: roles } = await admin
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (roles?.role !== 'admin') {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-center px-6">
        <span className="badge-mint mb-4">Access Denied</span>
        <h1 className="font-display text-3xl font-semibold text-plum-900">Admin area only</h1>
        <p className="mt-2 max-w-md text-sm text-ink-600">
          You are signed in, but your account does not have admin permissions. If this is a mistake, run the admin promotion SQL in your Supabase dashboard.
        </p>
        <a href="/account" className="btn-outline mt-6 px-5 py-2 text-xs">Back to my account</a>
      </div>
    );
  }

  return <>{children}</>;
}

export async function getSession(): Promise<AdminSession | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data: roles } = await admin
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  return {
    userId: user.id,
    email: user.email ?? null,
    isAdmin: roles?.role === 'admin',
  };
}
