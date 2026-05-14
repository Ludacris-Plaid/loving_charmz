import type { ReactNode } from 'react';
import Link from 'next/link';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { Section } from '@/components/ui/Section';
import { Container } from '@/components/ui/Container';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminGuard>
      <Section>
        <Container size="xl">
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="font-display text-2xl font-semibold text-brand-800">Admin</h1>
              <span className="rounded-pill bg-brand-700 px-2.5 py-0.5 text-xs font-medium text-white">
                Admin
              </span>
            </div>
            <Link
              href="/logout"
              className="text-sm font-medium text-brand-600 hover:text-brand-500 transition"
            >
              Sign out
            </Link>
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