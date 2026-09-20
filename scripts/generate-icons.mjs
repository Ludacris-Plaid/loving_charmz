#!/usr/bin/env node
/**
 * Regenerates the raster favicons from the committed vector source of truth,
 * `app/icon.svg`, so the vector mark and the raster fallbacks can never drift.
 *
 *   node scripts/generate-icons.mjs        # or: npm run icons
 *
 * Outputs (all committed):
 *   app/icon.svg            hand-authored source — never written by this script
 *   app/icon.png            192x192, rounded (Safari ignores SVG favicons)
 *   app/apple-icon.png      180x180, full bleed (iOS masks the corners itself)
 *   app/favicon.ico         16/32/48, legacy fallback at /favicon.ico
 *   public/email/logo.png   256x256 for transactional email headers (email
 *                           clients can't run Next's hashed asset pipeline, so
 *                           the emails reference this stable URL)
 *
 * Rasterising uses sharp, which ships with Next for image optimisation. Text is
 * rendered with whatever serif the machine has (Georgia on macOS/Windows,
 * Liberation/Noto Serif on Linux), so the PNGs bake in one serif while the SVG
 * lets the viewer's browser choose — both read as the same monogram.
 *
 * The email wordmark (`public/email/wordmark.png`) is different: webmail
 * clients (Gmail, Outlook, PrivateEmail…) strip web fonts, so "Charmz" can
 * never rely on @font-face there. It is drawn as pure vector paths from the
 * vendored Caveat variable font (same face as the site's --font-handwriting),
 * then rasterised — every client renders identical pixels.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as fontkit from 'fontkit';
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

/** Render a non-square SVG at its own declared width/height (density 72 = 1:1). */
async function renderNatural(svg) {
  return sharp(Buffer.from(svg), { density: 72 }).png({ compressionLevel: 9 }).toBuffer();
}

/**
 * Lay out `text` in the given font and return an SVG whose glyphs are pure
 * vector paths (y-axis flipped from font coords, positioned by pen advance).
 * No font file is needed to view the result.
 */
function textToPathSvg(text, font, emPx, fill) {
  const run = font.layout(text);
  const s = emPx / font.unitsPerEm;
  const width = run.advanceWidth * s;
  const height = (font.ascent - font.descent) * s;
  let penX = 0;
  const paths = [];
  for (let i = 0; i < run.glyphs.length; i++) {
    const d = run.glyphs[i].path.toSVG();
    if (d) {
      const x = (penX + run.positions[i].xOffset) * s;
      const y = font.ascent * s + run.positions[i].yOffset * s;
      paths.push(`<path d="${d}" transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${s.toFixed(5)} -${s.toFixed(5)})"/>`);
    }
    penX += run.positions[i].xAdvance;
  }
  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${width.toFixed(2)}" height="${height.toFixed(2)}" viewBox="0 0 ${width.toFixed(2)} ${height.toFixed(2)}"><g fill="${fill}">${paths.join('')}</g></svg>`,
    width: Math.round(width),
    height: Math.round(height),
  };
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

const emailLogo = await render(mark, 256);
writeFileSync(join(ROOT, 'public', 'email', 'logo.png'), emailLogo);

// Email wordmark: "Charmz" in Caveat 600 — the face of the site wordmark
// (.logo__charmz / --font-handwriting). Baked at em=120 and displayed at
// em=44 in the email header, ~2.7x oversampled so it stays crisp on retina.
const caveat = fontkit.openSync(join(ROOT, 'public', 'fonts', 'Caveat[wght].ttf'));
if (caveat.familyName !== 'Caveat') {
  throw new Error(`public/fonts must contain Caveat, found "${caveat.familyName}"`);
}
const wordmark = textToPathSvg('Charmz', caveat.getVariation({ wght: 600 }), 120, '#ffffff');
writeFileSync(join(ROOT, 'public', 'email', 'wordmark.png'), await renderNatural(wordmark.svg));

console.log('Wrote app/icon.png (192x192)');
console.log('Wrote app/apple-icon.png (180x180, full bleed)');
console.log(`Wrote app/favicon.ico (${icoPngs.map((e) => e.size).join('/')}, ${icoPngs.reduce((n, e) => n + e.data.length, 0) + 6 + 16 * icoPngs.length} bytes)`);
console.log('Wrote public/email/logo.png (256x256)');
console.log(`Wrote public/email/wordmark.png (${wordmark.width}x${wordmark.height}) — display at 118x56 in email`);
