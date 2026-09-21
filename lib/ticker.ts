import 'server-only';

import { unstable_cache } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  DEFAULT_TICKER,
  DEFAULT_HERO,
  TICKER_SLUG,
  HERO_SLUG,
  normaliseMessages,
  normaliseTheme,
  type TickerConfig,
} from './ticker-config';

export * from './ticker-config';

/**
 * Reads the ticker configuration from the `content_blocks` row (slug
 * `ticker`), cached for 60 seconds so admin edits reach the storefront
 * quickly without a per-request database hit.
 *
 * Everything degrades gracefully: no row, unpublished row, or a database
 * error all fall back to the classic default config — the site never loses
 * its banner because of a bad edit.
 */
export const getTickerConfig = unstable_cache(
  async (): Promise<TickerConfig> => {
    try {
      const admin = createAdminClient();
      const { data, error } = await admin
        .from('content_blocks')
        .select('metadata, is_published')
        .eq('slug', TICKER_SLUG)
        .maybeSingle();

      if (error || !data) return DEFAULT_TICKER;

      const metadata = (data.metadata && typeof data.metadata === 'object' ? data.metadata : {}) as Record<string, unknown>;

      return {
        published: Boolean(data.is_published),
        messages: normaliseMessages(metadata.messages),
        theme: normaliseTheme(metadata.theme),
      };
    } catch {
      return DEFAULT_TICKER;
    }
  },
  ['ticker-config'],
  { revalidate: 60, tags: ['ticker'] },
);

/**
 * Reads the homepage headline from the `content_blocks` row (slug
 * `homepage-hero`), cached alongside the ticker — admin edits reach the
 * storefront within 60 seconds. Falls back to the classic default
 * headline on any failure; the site never loses its hero.
 */
export const getHeroHeadline = unstable_cache(
  async (): Promise<string> => {
    try {
      const admin = createAdminClient();
      const { data, error } = await admin
        .from('content_blocks')
        .select('body')
        .eq('slug', HERO_SLUG)
        .maybeSingle();

      if (error || !data) return DEFAULT_HERO;
      const body = typeof data.body === 'string' ? data.body.trim() : '';
      return body || DEFAULT_HERO;
    } catch {
      return DEFAULT_HERO;
    }
  },
  ['hero-headline'],
  { revalidate: 60, tags: ['hero'] },
);
