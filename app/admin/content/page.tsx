import { getTickerConfig, TICKER_THEMES, DEFAULT_TICKER } from '@/lib/ticker';
import { AdminTickerClient } from '@/components/admin/AdminTickerClient';

export const metadata = {
  title: 'Admin · Ticker Bar — Loving Charmz',
};

export const dynamic = 'force-dynamic';

/**
 * Content tab — owns the site ticker (the scrolling banner under the header).
 *
 * Mom edits the messages (emojis welcome), picks a colour theme from the site
 * palette, and toggles the whole banner on/off. Changes hit the live site
 * within a minute (the storefront caches the ticker for 60s).
 */
export default async function AdminContentPage() {
  const config = await getTickerConfig();

  return (
    <div className="space-y-6">
      <div>
        <span className="badge-plum">Editorial</span>
        <h1 className="font-display text-3xl font-semibold text-plum-900 mt-3">Site ticker</h1>
        <p className="text-sm text-ink-600 mt-1">
          The scrolling banner under the header. Changes go live within a minute.
        </p>
      </div>
      <AdminTickerClient
        initialConfig={{
          published: config.published,
          messages: config.messages,
          theme: config.theme,
        }}
        themes={Object.entries(TICKER_THEMES).map(([key, t]) => ({
          key,
          label: t.label,
          swatch: t.swatch,
        }))}
        fallback={DEFAULT_TICKER.messages}
      />
    </div>
  );
}
