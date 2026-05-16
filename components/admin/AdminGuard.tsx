import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ReactNode } from 'react';

type AdminGuardProps = {
  children: ReactNode;
};

export async function AdminGuard({ children }: AdminGuardProps) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If no user, redirect to login
  if (!user) {
    redirect('/login');
  }

  // Use admin client (service_role) to bypass RLS
  const adminClient = createAdminClient();
  const { data: roles } = await adminClient
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  // If not admin role, show access denied
  if (roles?.role !== 'admin') {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-center p-8">
        <h1 className="font-display text-2xl font-semibold text-obsidian-50">Access Denied</h1>
        <p className="mt-2 text-sm text-obsidian-400">
          You do not have permission to access the admin area.
        </p>
        <p className="mt-4 text-xs text-obsidian-500">
          User ID: {user.id}
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

export async function getSession() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const adminClient = createAdminClient();
  const { data: roles } = await adminClient
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  return {
    userId: user.id,
    email: user.email,
    isAdmin: roles?.role === 'admin',
  };
}
