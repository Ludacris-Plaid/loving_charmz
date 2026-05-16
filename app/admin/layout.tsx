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
              <h1 className="font-display text-2xl font-semibold text-obsidian-50">Admin</h1>
              <span className="rounded-pill bg-gold-600 px-2.5 py-0.5 text-xs font-medium text-obsidian-950">
                Admin
              </span>
            </div>
            <Link
              href="/logout"
              className="text-sm font-medium text-obsidian-400 hover:text-gold-400 transition"
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