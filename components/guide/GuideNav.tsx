'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * Guide navigation — a clickable chapter index and a universal search over
 * the whole how-to guide.
 *
 * The search index is built from the rendered page itself (every chapter
 * section inside #guide-content), so it always matches the live text with
 * zero maintenance: new chapters and Q&As become searchable the moment
 * they are written. Everything runs in the browser — no server calls.
 *
 * The index is scroll-spy: the chapter currently on screen is highlighted,
 * so mom always knows where she is in the guide.
 */

type Entry = {
  chapterId: string;
  chapterLabel: string;
  /** Text of the matching element (question, heading, step…). */
  text: string;
};

function chapterTitle(id: string, labels: Map<string, string>): string {
  return labels.get(id) ?? 'Guide';
}

/** Collect searchable blocks from the DOM, grouped by their chapter section. */
function collectIndex(labels: Map<string, string>): Entry[] {
  const root = document.getElementById('guide-content');
  if (!root) return [];
  const entries: Entry[] = [];
  const sections = root.querySelectorAll<HTMLElement>('[data-chapter]');
  sections.forEach((section) => {
    const chapterId = section.dataset.chapter ?? '';
    const label = chapterTitle(chapterId, labels);
    // Searchable atoms: headings, list items, paragraphs, Q&A cards, tips.
    const blocks = section.querySelectorAll<HTMLElement>('h2, h3, li, p, .surface-card');
    blocks.forEach((block) => {
      const text = (block.textContent ?? '').replace(/\s+/g, ' ').trim();
      if (text.length < 4) return;
      entries.push({ chapterId, chapterLabel: label, text: text.slice(0, 220) });
    });
  });
  return entries;
}

function highlight(text: string, query: string): Array<string | { match: string }> {
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  const out: Array<string | { match: string }> = [];
  let from = 0;
  let idx = lower.indexOf(q);
  while (idx !== -1 && out.length < 12) {
    if (idx > from) out.push(text.slice(from, idx));
    out.push({ match: text.slice(idx, idx + q.length) });
    from = idx + q.length;
    idx = lower.indexOf(q, from);
  }
  if (from < text.length) out.push(text.slice(from));
  return out;
}

export function GuideNav({ chapters }: { chapters: Array<{ id: string; label: string }> }) {
  const labels = useMemo(() => new Map(chapters.map((c) => [c.id, c.label])), [chapters]);
  const [activeId, setActiveId] = useState(chapters[0]?.id ?? '');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<Entry[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll-spy: highlight the chapter whose section is currently on screen.
  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-chapter]'));
    if (sections.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActiveId((e.target as HTMLElement).dataset.chapter ?? '');
        }
      },
      { rootMargin: '-20% 0px -70% 0px' },
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  const runSearch = useCallback(
    (q: string) => {
      setQuery(q);
      if (q.trim().length < 2) {
        setResults([]);
        return;
      }
      const idx = collectIndex(labels);
      const needle = q.trim().toLowerCase();
      const words = needle.split(/\s+/).filter(Boolean);
      const hits = idx.filter((e) => {
        const t = e.text.toLowerCase();
        return words.every((w) => t.includes(w));
      });
      // A match in a Q&A/tip card or list item is more useful than a bare
      // paragraph hit; but preserve document order for scanning.
      setResults(hits.slice(0, 30));
    },
    [labels],
  );

  const jump = useCallback((chapterId: string) => {
    setOpen(false);
    setQuery('');
    setResults([]);
    const el = document.getElementById(chapterId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  return (
    <>
      {/* ── Search box ─────────────────────────────────────────────── */}
      <div className="relative my-6">
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => runSearch(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Search the whole guide — try “refund”, “tracking”, “sold out”…"
          aria-label="Search the guide"
          className="w-full rounded-pill border border-cream-300 bg-surface px-5 py-3 text-sm text-ink-800 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-plum-500"
        />
        {query.trim().length >= 2 && (
          <div
            className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-40 max-h-96 overflow-y-auto rounded-block border border-cream-300 bg-surface p-2 shadow-[0_20px_50px_rgba(93,51,115,0.14)]"
            role="listbox"
            aria-label="Search results"
          >
            {results.length === 0 ? (
              <p className="px-3 py-4 text-sm text-ink-500">
                Nothing found for “{query}”. Try a shorter word — like{' '}
                <em>stock</em> or <em>label</em>.
              </p>
            ) : (
              results.map((r, i) => (
                <button
                  key={`${r.chapterId}-${i}`}
                  type="button"
                  role="option"
                  aria-selected={false}
                  onClick={() => jump(r.chapterId)}
                  className="block w-full rounded-lg px-3 py-2.5 text-left motion-base hover:bg-plum-50"
                >
                  <p className="text-[10px] font-bold uppercase tracking-widest text-plum-600">
                    {r.chapterLabel}
                  </p>
                  <p className="mt-0.5 text-sm text-ink-800 leading-snug">
                    {highlight(r.text, query.trim()).map((part, j) =>
                      typeof part === 'string' ? (
                        <span key={j}>{part}</span>
                      ) : (
                        <mark key={j} className="rounded bg-mint-200/70 px-0.5 text-ink-900">
                          {part.match}
                        </mark>
                      ),
                    )}
                  </p>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* ── Clickable chapter index (scroll-spy highlighted) ───────── */}
      <nav
        aria-label="Guide chapters"
        className="surface-card p-5 my-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6"
      >
        {chapters.map((c) => (
          <a
            key={c.id}
            href={`#${c.id}`}
            onClick={(e) => {
              e.preventDefault();
              jump(c.id);
            }}
            aria-current={activeId === c.id ? 'true' : undefined}
            className={[
              'py-1.5 text-sm motion-base border-l-2 pl-3 -ml-3',
              activeId === c.id
                ? 'border-plum-700 text-plum-900 font-semibold bg-plum-50/60 rounded-r-lg'
                : 'border-transparent text-plum-700 hover:text-plum-900 hover:underline',
            ].join(' ')}
          >
            {c.label}
          </a>
        ))}
      </nav>
    </>
  );
}
