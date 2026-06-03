import type { ReactNode } from 'react';
import { Suspense } from 'react';
import Link from 'next/link';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminGuard, getSession } from '@/components/admin/AdminGuard';
import { Container } from '@/components/ui/Container';
import { Section } from '@/components/ui/Section';
import { NavigationProgress } from '@/components/ui/NavigationProgress';
import { Logo } from '@/components/marketing/Logo';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  return (
    <AdminGuard>
      <Suspense fallback={null}>
        <NavigationProgress />
      </Suspense>
      <Section className="bg-cream-50">
        <Container size="xl">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Logo size="sm" />
              <span aria-hidden className="text-cream-400">/</span>
              <h1 className="font-display text-xl font-semibold text-plum-900">Admin</h1>
              <span className="badge-plum">Admin</span>
            </div>
            <nav className="flex flex-wrap items-center gap-4 text-sm">
              <Link href="/shop" className="font-medium text-ink-600 hover:text-plum-700 motion-base">
                ← View storefront
              </Link>
              <Link href="/account" className="font-medium text-ink-600 hover:text-plum-700 motion-base">
                My account
              </Link>
              {session?.email && (
                <span className="hidden text-xs text-ink-500 sm:inline">{session.email}</span>
              )}
              <Link
                href="/logout"
                className="font-medium text-ink-600 hover:text-plum-700 motion-base"
              >
                Sign out
              </Link>
            </nav>
          </div>
          <div className="flex flex-col gap-8 lg:flex-row">
            <AdminSidebar />
            <main className="min-w-0 flex-1">{children}</main>
          </div>
        </Container>
      </Section>
    </AdminGuard>
  );
}
