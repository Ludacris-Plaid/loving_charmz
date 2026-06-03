import { Suspense } from 'react';
import { getAnalyticsSnapshot } from '@/lib/admin/analytics/queries';
import { decodeFilters } from '@/lib/admin/analytics/urlState';
import { AnalyticsShell } from '@/components/admin/analytics/AnalyticsShell';
import { isAnalyticsTabId } from '@/components/admin/analytics/tabs';
import { PageLoader } from '@/components/ui/PageLoader';

export const metadata = {
  title: 'Admin · Analytics — Loving Charmz',
};

export const dynamic = 'force-dynamic';

type SearchParams = { [key: string]: string | string[] | undefined };

function paramToString(value: string | string[] | undefined): string | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminAnalyticsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const tabParam = paramToString(sp.tab);
  const tab = isAnalyticsTabId(tabParam) ? tabParam : 'overview';

  const queryParams: Record<string, string> = {};
  for (const [k, v] of Object.entries(sp)) {
    const s = paramToString(v);
    if (s !== undefined) queryParams[k] = s;
  }
  const filters = decodeFilters(new URLSearchParams(queryParams));
  const snapshot = await getAnalyticsSnapshot(filters);

  return (
    <Suspense fallback={<PageLoader message="Loading analytics" />}>
      <AnalyticsShell snapshot={snapshot} tab={tab} />
    </Suspense>
  );
}
