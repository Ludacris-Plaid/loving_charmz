import { describe, expect, it } from 'vitest';

import { parseDescription } from '@/lib/shop/description';

/**
 * The product page renders descriptions authored as plain text. These tests
 * pin the parsing rules: narrative lines become paragraphs, "Label: value"
 * lines become a bulleted spec list, and short trailing lines after the spec
 * block ("Handmade in Alberta") join the bullets instead of floating as
 * stray prose.
 */
describe('parseDescription', () => {
  it('splits narrative lines into paragraphs', () => {
    const r = parseDescription('First thought.\nSecond thought about the charm.');
    expect(r.paragraphs).toEqual(['First thought.', 'Second thought about the charm.']);
    expect(r.specs).toEqual([]);
  });

  it('turns "Label: value" lines into bulleted specs', () => {
    const r = parseDescription('A lovely charm.\nMaterial: Stainless steel\nSize: Large-2.10”');
    expect(r.paragraphs).toEqual(['A lovely charm.']);
    expect(r.specs).toEqual([
      { label: 'Material', value: 'Stainless steel' },
      { label: 'Size', value: 'Large-2.10”' },
    ]);
  });

  it('pulls short unpunctuated lines after the spec block into the bullets', () => {
    const r = parseDescription('Story line.\nMaterial: Brass\nHandmade in Alberta');
    expect(r.paragraphs).toEqual(['Story line.']);
    expect(r.specs).toEqual([
      { label: 'Material', value: 'Brass' },
      { label: null, value: 'Handmade in Alberta' },
    ]);
  });

  it('handles \r\n line endings from Windows-authored text', () => {
    const r = parseDescription('Para one.\r\nMaterial: Brass\r\nPara two.');
    expect(r.paragraphs).toEqual(['Para one.', 'Para two.']);
    expect(r.specs).toEqual([{ label: 'Material', value: 'Brass' }]);
  });

  it('keeps prose that merely contains a colon out of the specs', () => {
    const r = parseDescription('The one who follows you from room to room: always there.');
    expect(r.paragraphs).toEqual(['The one who follows you from room to room: always there.']);
    expect(r.specs).toEqual([]);
  });

  it('returns empty parts for empty input', () => {
    expect(parseDescription('')).toEqual({ paragraphs: [], specs: [] });
    expect(parseDescription(null as unknown as string)).toEqual({ paragraphs: [], specs: [] });
  });
});
