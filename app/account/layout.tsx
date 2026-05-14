import type { ReactNode } from 'react';
import Link from 'next/link';
import { AccountSidebar } from '@/components/account/AccountSidebar';
import { Section } from '@/components/ui/Section';
import { Container } from '@/components/ui/Container';

export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <Section>
      <Container>
        <div className="mb-8 flex items-center justify-between">
          <h1 className="font-display text-2xl font-semibold text-brand-800">My Account</h1>
          <Link
            href="/logout"
            className="text-sm font-medium text-brand-600 hover:text-brand-500 transition"
          >
            Sign out
          </Link>
        </div>
        <div className="flex flex-col gap-8 lg:flex-row">
          <AccountSidebar />
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </Container>
    </Section>
  );
}