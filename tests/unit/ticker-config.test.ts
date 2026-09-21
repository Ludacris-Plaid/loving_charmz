import { describe, expect, it } from 'vitest';

import {
  DEFAULT_TICKER,
  TICKER_THEMES,
  normaliseMessages,
  normaliseTheme,
} from '@/lib/ticker-config';

/**
 * The ticker falls back to safe defaults on any bad input — a mom typing
 * emoji-heavy copy or picking themes from the admin should never be able to
 * break the storefront banner. These tests pin that contract.
 */
describe('normaliseTheme', () => {
  it('accepts every defined theme key', () => {
    for (const key of Object.keys(TICKER_THEMES)) {
      expect(normaliseTheme(key)).toBe(key);
    }
  });

  it('falls back to plum on unknown or non-string values', () => {
    expect(normaliseTheme('neon')).toBe('plum');
    expect(normaliseTheme(42)).toBe('plum');
    expect(normaliseTheme(null)).toBe('plum');
    expect(normaliseTheme(undefined)).toBe('plum');
  });
});

describe('normaliseMessages', () => {
  it('keeps valid strings, trims, and enforces the 140-char cap', () => {
    const long = 'x'.repeat(200);
    expect(normaliseMessages(['  Hi there  ', long])).toEqual(['Hi there', 'x'.repeat(140)]);
  });

  it('drops empty and non-string entries', () => {
    expect(normaliseMessages(['real', '   ', 42, null, '✨ more'])).toEqual(['real', '✨ more']);
  });

  it('falls back to the default message when nothing usable remains', () => {
    expect(normaliseMessages(['   '])).toEqual(DEFAULT_TICKER.messages);
    expect(normaliseMessages('not an array')).toEqual(DEFAULT_TICKER.messages);
    expect(normaliseMessages([])).toEqual(DEFAULT_TICKER.messages);
  });

  it('preserves emoji content untouched', () => {
    const msg = '🎁 Gift wrapping included — just ask 🇨🇦';
    expect(normaliseMessages([msg])).toEqual([msg]);
  });
});
