import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

type AdminGuardProps = {
  children: ReactNode;
};

export function AdminGuard({ children }: AdminGuardProps) {
  // Phase 1: placeholder — no Supabase auth wired yet
  // When Phase 2 auth is built, this will check the session role from Supabase
  // and redirect non-admin users to /login or show "Unauthorized"
  return <>{children}</>;
}

export function requireAdmin() {
  // Phase 1: placeholder — always returns admin session stub
  // When Phase 2 auth is built, this will redirect non-admin users
  return { userId: 'placeholder' };
}