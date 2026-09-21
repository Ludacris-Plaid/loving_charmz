import { parseHeroHeadline, type HeroLine } from '@/lib/ticker-config';

/**
 * Homepage headline renderer.
 *
 * Takes the admin-authored mini-format (words in "quotes" render purple,
 * one line per row) and emits the same animated structure the homepage
 * has always used: `.hero-word` spans with the staggered entrance delays
 * (continuous across the whole headline, not per line) and the plum
 * gradient for quoted words. Nothing else about the hero typography
 * changes.
 *
 * Purely presentational — the text arrives pre-parsed into plain tokens
 * (parseHeroHeadline) and renders as React text nodes, so authored text
 * can never inject markup.
 */
export function HeroHeadline({ raw }: { raw: string }) {
  const lines: HeroLine[] = parseHeroHeadline(raw);

  return (
    <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-semibold leading-[1.05] tracking-tight mt-8">
      {lines.map((line, li) => (
        <span key={li} className={li > 0 ? 'block mt-2' : 'block'}>
          {line.map((word, wi) => (
            <span key={wi}>
              <span
                className={`hero-word hero-word-${((lines.slice(0, li).reduce((n, l) => n + l.length, 0) + wi) % 6) + 1} ${
                  word.purple ? 'plum-gradient-text' : 'text-plum-900'
                }`}
              >
                {word.text}
              </span>
              {wi < line.length - 1 ? ' ' : null}
            </span>
          ))}
        </span>
      ))}
    </h1>
  );
}
