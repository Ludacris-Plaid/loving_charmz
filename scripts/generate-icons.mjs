#!/usr/bin/env node
/**
 * Regenerates the raster favicons from the committed vector source of truth,
 * `app/icon.svg`, so the vector mark and the raster fallbacks can never drift.
 *
 *   node scripts/generate-icons.mjs        # or: npm run icons
 *
 * Outputs (all committed, all picked up by Next's file conventions):
 *   app/icon.svg       hand-authored source — never written by this script
 *   app/icon.png       192x192, rounded (Safari ignores SVG favicons)
 *   app/apple-icon.png 180x180, full bleed (iOS masks the corners itself)
 *   app/favicon.ico    16/32/48, legacy fallback at /favicon.ico
 *
 * Rasterising uses sharp, which ships with Next for image optimisation. Text is
 * rendered with whatever serif the machine has (Georgia on macOS/Windows,
 * Liberation/Noto Serif on Linux), so the PNGs bake in one serif while the SVG
 * lets the viewer's browser choose — both read as the same monogram.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ICON_SVG = join(ROOT, 'app', 'icon.svg');

/** Render an SVG string at an exact pixel size (viewBox is 64x64). */
async function render(svg, size) {
  return sharp(Buffer.from(svg), { density: (72 * size) / 64 })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/**
 * Minimal ICO container holding PNG payloads (supported since Windows Vista and
 * by every current browser). Each 16-byte directory entry points at one PNG.
 */
function ico(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // 1 = icon
  header.writeUInt16LE(entries.length, 4);

  const dir = Buffer.alloc(16 * entries.length);
  let offset = header.length + dir.length;
  entries.forEach(({ size, data }, i) => {
    const at = 16 * i;
    dir.writeUInt8(size >= 256 ? 0 : size, at); // 0 means 256
    dir.writeUInt8(size >= 256 ? 0 : size, at + 1);
    dir.writeUInt8(0, at + 2); // palette size
    dir.writeUInt8(0, at + 3); // reserved
    dir.writeUInt16LE(1, at + 4); // colour planes
    dir.writeUInt16LE(32, at + 6); // bits per pixel
    dir.writeUInt32LE(data.length, at + 8);
    dir.writeUInt32LE(offset, at + 12);
    offset += data.length;
  });

  return Buffer.concat([header, dir, ...entries.map((e) => e.data)]);
}

const mark = readFileSync(ICON_SVG, 'utf8');

// iOS applies its own corner mask, so the apple icon must be an opaque square.
// Both replacements are asserted below rather than guessed.
const APPLE_BG = '<rect x="1.5" y="1.5" width="61" height="61" rx="14" fill="url(#lc-plum)" />';
const APPLE_EDGE = '<rect x="2.25" y="2.25" width="59.5" height="59.5" rx="13.25" fill="none" stroke="#ffffff" stroke-opacity="0.16" stroke-width="1.5" />';
if (!mark.includes(APPLE_BG) || !mark.includes(APPLE_EDGE)) {
  throw new Error(
    `app/icon.svg changed shape: expected the ${APPLE_BG.length}-byte background rect and its inset edge.\n` +
      'Update scripts/generate-icons.mjs to match (or restore those two rects).',
  );
}
const appleMark = mark
  .replace(APPLE_BG, '<rect x="0" y="0" width="64" height="64" fill="url(#lc-plum)" />')
  .replace(APPLE_EDGE, '');

const iconPng = await render(mark, 192);
const applePng = await render(appleMark, 180);
const icoPngs = await Promise.all([16, 32, 48].map(async (size) => ({ size, data: await render(mark, size) })));

writeFileSync(join(ROOT, 'app', 'icon.png'), iconPng);
writeFileSync(join(ROOT, 'app', 'apple-icon.png'), applePng);
writeFileSync(join(ROOT, 'app', 'favicon.ico'), ico(icoPngs));

console.log('Wrote app/icon.png (192x192)');
console.log('Wrote app/apple-icon.png (180x180, full bleed)');
console.log(`Wrote app/favicon.ico (${icoPngs.map((e) => e.size).join('/')}, ${icoPngs.reduce((n, e) => n + e.data.length, 0) + 6 + 16 * icoPngs.length} bytes)`);
