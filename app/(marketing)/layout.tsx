import type { ReactNode } from 'react';
import { Header } from '@/components/marketing/Header';
import { Footer } from '@/components/marketing/Footer';
import { HeaderScroll } from '@/components/ui/HeaderScroll';
import { NavigationProgress } from '@/components/ui/NavigationProgress';
import { CanadianBanner } from '@/components/ui/CanadianBanner';
import { ClientPopups } from '@/components/ui/ClientPopups';
import { Suspense } from 'react';
import { getTickerConfig } from '@/lib/ticker';

export default async function MarketingLayout({ children }: { children: ReactNode }) {
  const tickerConfig = await getTickerConfig();

  return (
    <>
      <Suspense fallback={null}>
        <NavigationProgress />
      </Suspense>
      <Header />
      {tickerConfig.published && <CanadianBanner config={tickerConfig} />}
      <HeaderScroll />
      <main className="min-h-[60vh]">{children}</main>
      <Footer />
      <ClientPopups />
    </>
  );
}
