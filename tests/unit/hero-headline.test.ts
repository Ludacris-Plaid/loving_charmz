import { describe, expect, it } from 'vitest';

import {
  DEFAULT_HERO,
  HERO_MAX_LINES,
  HERO_MAX_LINE_LENGTH,
  parseHeroHeadline,
} from '@/lib/ticker-config';

describe('parseHeroHeadline', () => {
  it('parses the default headline: quoted words purple, line breaks preserved', () => {
    const lines = parseHeroHeadline(DEFAULT_HERO);
    expect(lines).toEqual([
      [
        { text: 'Symbolic', purple: false },
        { text: 'jewelry', purple: true },
      ],
      [
        { text: 'for', purple: false },
        { text: 'the', purple: false },
        { text: 'bond', purple: false },
      ],
      [
        { text: 'that', purple: false },
        { text: 'lasts', purple: true },
      ],
    ]);
  });

  it('marks every quoted word purple, adjacent or not', () => {
    const lines = parseHeroHeadline('"Handmade" "with" love');
    expect(lines[0]).toEqual([
      { text: 'Handmade', purple: true },
      { text: 'with', purple: true },
      { text: 'love', purple: false },
    ]);
  });

  it('handles an unclosed quote gracefully (no crash, quote dropped)', () => {
    const lines = parseHeroHeadline('Symbolic "jewelry');
    expect(lines[0]).toEqual([
      { text: 'Symbolic', purple: false },
      { text: 'jewelry', purple: false },
    ]);
  });

  it('falls back to the default on empty input', () => {
    expect(parseHeroHeadline('')).toEqual(parseHeroHeadline(DEFAULT_HERO));
    expect(parseHeroHeadline(null)).toEqual(parseHeroHeadline(DEFAULT_HERO));
  });

  it('caps lines and line length', () => {
    const tooMany = Array.from({ length: 6 }, (_, i) => `line${i}`).join('\n');
    expect(parseHeroHeadline(tooMany)).toHaveLength(HERO_MAX_LINES);
    const tooLong = 'x'.repeat(HERO_MAX_LINE_LENGTH + 50);
    expect(parseHeroHeadline(tooLong)[0][0].text).toHaveLength(HERO_MAX_LINE_LENGTH);
  });

  it('never emits quote characters into rendered text', () => {
    const text = parseHeroHeadline('say "hello" now')
      .flat()
      .map((w) => w.text)
      .join(' ');
    expect(text).not.toContain('"');
  });
});
