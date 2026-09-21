import { getTickerConfig, getHeroHeadline, getHeroSubheadline, TICKER_THEMES, DEFAULT_TICKER, DEFAULT_HERO, DEFAULT_HERO_SUBHEADLINE } from '@/lib/ticker';
import { AdminTickerClient } from '@/components/admin/AdminTickerClient';

export const metadata = {
  title: 'Admin · Homepage Design — Loving Charmz',
};

export const dynamic = 'force-dynamic';

/**
 * Homepage Design tab — owns the storefront homepage's editable pieces:
 * the site ticker (scrolling banner under the header) and the hero
 * headline. Changes hit the live site within a minute (60s cache).
 */
export default async function AdminContentPage() {
  const [config, hero, subheadline] = await Promise.all([
    getTickerConfig(),
    getHeroHeadline(),
    getHeroSubheadline(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <span className="badge-plum">Editorial</span>
        <h1 className="font-display text-3xl font-semibold text-plum-900 mt-3">Homepage design</h1>
        <p className="text-sm text-ink-600 mt-1">
          The ticker banner and the homepage headline. Changes go live within a minute.
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
        initialHero={hero || DEFAULT_HERO}
        initialSubheadline={subheadline ?? DEFAULT_HERO_SUBHEADLINE}
      />
    </div>
  );
}
