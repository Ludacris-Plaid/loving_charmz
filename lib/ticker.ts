import 'server-only';

import { unstable_cache } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  DEFAULT_TICKER,
  TICKER_SLUG,
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
