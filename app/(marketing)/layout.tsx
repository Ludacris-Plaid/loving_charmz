import type { ReactNode } from 'react';
import { Header } from '@/components/marketing/Header';
import { Footer } from '@/components/marketing/Footer';
import { HeaderScroll } from '@/components/ui/HeaderScroll';
import { NavigationProgress } from '@/components/ui/NavigationProgress';
import { CanadianBanner } from '@/components/ui/CanadianBanner';
import { ClientPopups } from '@/components/ui/ClientPopups';
import { Suspense } from 'react';

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <NavigationProgress />
      </Suspense>
      <Header />
      <CanadianBanner />
      <HeaderScroll />
      <main className="min-h-[60vh]">{children}</main>
      <Footer />
      <ClientPopups />
    </>
  );
}
