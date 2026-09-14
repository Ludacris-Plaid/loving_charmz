import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The favicon ships as four files that must stay in sync: the hand-authored
 * vector (`app/icon.svg`) plus three raster fallbacks generated from it by
 * `npm run icons`. These tests fail loudly if a browser-facing file goes
 * missing, if the rasters and the vector disagree on size, or if `icon.svg` is
 * reshaped in a way that silently breaks the generator's background swap.
 */
const APP = join(process.cwd(), 'app');
const read = (name: string) => readFileSync(join(APP, name));

const iconSvg = read('icon.svg').toString('utf8');
const iconPng = read('icon.png');
const applePng = read('apple-icon.png');
const faviconIco = read('favicon.ico');

function pngSize(buf: Buffer) {
  expect(buf.subarray(1, 4).toString('ascii')).toBe('PNG');
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function icoEntries(buf: Buffer) {
  expect(buf.readUInt16LE(0)).toBe(0); // reserved
  expect(buf.readUInt16LE(2)).toBe(1); // 1 = icon
  const count = buf.readUInt16LE(4);
  return Array.from({ length: count }, (_, i) => {
    const at = 6 + 16 * i;
    return {
      width: buf.readUInt8(at),
      height: buf.readUInt8(at + 1),
      bytes: buf.readUInt32LE(at + 8),
      offset: buf.readUInt32LE(at + 12),
    };
  });
}

describe('brand icons', () => {
  it('draws the monogram on the brand plum gradient', () => {
    expect(iconSvg).toContain('<svg');
    expect(iconSvg).toContain('url(#lc-plum)');
    expect(iconSvg).toContain('#5d3373'); // --color-plum-700
    expect(iconSvg).toContain('#3a1f48'); // --color-plum-900
    expect(iconSvg).toContain('#fbf7f0'); // --color-cream-100
    expect(iconSvg).toContain('#b3ecec'); // --color-mint-300
    expect(iconSvg).toContain('>L</tspan>');
    expect(iconSvg).toContain('>C</tspan>');
  });

  it('keeps the shape the icon generator rewrites for the apple icon', () => {
    // scripts/generate-icons.mjs swaps these two rects for a full-bleed
    // background; it throws if either disappears, so assert them here too.
    expect(iconSvg).toContain('<rect x="1.5" y="1.5" width="61" height="61" rx="14" fill="url(#lc-plum)" />');
    expect(iconSvg).toContain('<rect x="2.25" y="2.25" width="59.5" height="59.5" rx="13.25" fill="none"');
  });

  it('ships a raster favicon at the sizes browsers and iOS expect', () => {
    expect(pngSize(iconPng)).toEqual({ width: 192, height: 192 });
    expect(pngSize(applePng)).toEqual({ width: 180, height: 180 });
  });

  it('packs 16/32/48 PNG frames into favicon.ico', () => {
    const entries = icoEntries(faviconIco);
    expect(entries.map((e) => e.width)).toEqual([16, 32, 48]);
    expect(entries.map((e) => e.height)).toEqual([16, 32, 48]);
    for (const entry of entries) {
      expect(entry.offset + entry.bytes).toBeLessThanOrEqual(faviconIco.length);
      const frame = faviconIco.subarray(entry.offset, entry.offset + entry.bytes);
      expect(pngSize(frame)).toEqual({ width: entry.width, height: entry.height });
    }
  });
});
