import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { ReactNode } from 'react';

type AdminGuardProps = {
  children: ReactNode;
};

export async function AdminGuard({ children }: AdminGuardProps) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Check if user has admin role
  const { data: roles } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (roles?.role !== 'admin') {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
        <h1 className="font-display text-2xl font-semibold text-brand-800">Access Denied</h1>
        <p className="mt-2 text-sm text-brand-600">
          You do not have permission to access the admin area.
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

  const { data: roles } = await supabase
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
