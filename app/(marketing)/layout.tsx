import type { ReactNode } from 'react';
import { Header } from '@/components/marketing/Header';
import { Footer } from '@/components/marketing/Footer';
import { HeaderScroll } from '@/components/ui/HeaderScroll';
import { NavigationProgress } from '@/components/ui/NavigationProgress';
import { Suspense } from 'react';

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <NavigationProgress />
      </Suspense>
      <Header />
      <HeaderScroll />
      <main className="min-h-[60vh]">{children}</main>
      <Footer />
    </>
  );
}
