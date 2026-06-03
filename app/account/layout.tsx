import type { ReactNode } from 'react';
import { Suspense } from 'react';
import Link from 'next/link';
import { AccountSidebar } from '@/components/account/AccountSidebar';
import { Container } from '@/components/ui/Container';
import { Section } from '@/components/ui/Section';
import { NavigationProgress } from '@/components/ui/NavigationProgress';
import { Logo } from '@/components/marketing/Logo';

export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <Section>
      <Suspense fallback={null}>
        <NavigationProgress />
      </Suspense>
      <Container>
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Logo size="sm" />
            <span aria-hidden className="text-cream-400">/</span>
            <h1 className="font-display text-xl font-semibold text-plum-900">My Account</h1>
          </div>
          <nav className="flex flex-wrap items-center gap-4 text-sm">
            <Link href="/shop" className="font-medium text-ink-600 hover:text-plum-700 motion-base">
              ← Back to shop
            </Link>
            <Link
              href="/logout"
              className="font-medium text-ink-600 hover:text-plum-700 motion-base"
            >
              Sign out
            </Link>
          </nav>
        </div>
        <div className="flex flex-col gap-8 lg:flex-row">
          <AccountSidebar />
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </Container>
    </Section>
  );
}
