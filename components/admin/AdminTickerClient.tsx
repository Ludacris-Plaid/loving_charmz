'use client';

import { useState, useTransition } from 'react';

import { upsertTickerAction } from '@/lib/admin/actions';
import type { TickerConfig, TickerTheme } from '@/lib/ticker-config';
import { CanadianBanner } from '@/components/ui/CanadianBanner';
import { HeroHeadline } from '@/components/ui/HeroHeadline';

type ThemeOption = { key: string; label: string; swatch: string };

type Props = {
  initialConfig: TickerConfig;
  themes: ThemeOption[];
  fallback: string[];
  initialHero: string;
};

const MAX_MESSAGES = 5;
const MAX_LENGTH = 140;
const MAX_HERO_LINES = 3;

/**
 * Ticker editor — one screen, one job.
 *
 * A textarea (one message per line, emojis welcome), theme swatches, the
 * publish toggle, and a live preview that renders the real banner component
 * exactly as shoppers see it before anything is saved.
 */
export function AdminTickerClient({ initialConfig, themes, fallback, initialHero }: Props) {
  const [messages, setMessages] = useState(initialConfig.messages.join('\n'));
  const [theme, setTheme] = useState<TickerTheme>(initialConfig.theme);
  const [published, setPublished] = useState(initialConfig.published);
  const [hero, setHero] = useState(initialHero);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const previewMessages =
    messages
      .split('\n')
      .map((m) => m.trim().slice(0, MAX_LENGTH))
      .filter(Boolean) || fallback;

  const previewConfig: TickerConfig = { published: true, messages: previewMessages, theme };

  const handleSubmit = () => {
    setError(null);
    setSuccess(null);
    const formData = new FormData();
    formData.set('messages', messages);
    formData.set('theme', theme);
    formData.set('hero', hero);
    if (published) formData.set('is_published', 'on');

    startTransition(async () => {
      const res = await upsertTickerAction(formData);
      if (res.error) setError(res.error);
      else {
        setSuccess('Ticker saved — live on the site within a minute.');
        setTimeout(() => setSuccess(null), 3000);
      }
    });
  };

  const messageCount = previewMessages.length;

  return (
    <div className="space-y-6">
      {/* Live preview — the real banner component with the unsaved config */}
      <div className="overflow-hidden rounded-lg border border-cream-300">
        <div className="bg-cream-100 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-ink-500">
          Live preview — exactly what shoppers see
        </div>
        <CanadianBanner config={previewConfig} />
      </div>

      <div className="surface-card space-y-6 p-6">
        {/* Messages */}
        <div>
          <div className="mb-1.5 flex items-baseline justify-between">
            <label htmlFor="messages" className="block text-sm font-medium text-ink-700">
              Messages — one per line
            </label>
            <span className={`text-xs ${messageCount > MAX_MESSAGES ? 'text-red-600' : 'text-ink-400'}`}>
              {messageCount}/{MAX_MESSAGES} messages
            </span>
          </div>
          <textarea
            id="messages"
            value={messages}
            onChange={(e) => setMessages(e.target.value)}
            rows={4}
            maxLength={MAX_MESSAGES * (MAX_LENGTH + 1)}
            placeholder={'✨ New charms just landed\n🎁 Gift wrapping included — just ask\n💌 Custom orders welcome'}
            className="input-base resize-y font-[emoji-enabled]"
          />
          <p className="mt-1.5 text-xs text-ink-500">
            Emojis work great. Each line becomes one item in the rotation — keep lines short so they
            read at a glance. &ldquo;Proudly Canadian 🇨🇦&rdquo; always leads and can&rsquo;t be removed.
          </p>
        </div>

        {/* Theme picker */}
        <div>
          <span className="mb-2 block text-sm font-medium text-ink-700">Colour theme</span>
          <div className="flex flex-wrap gap-3">
            {themes.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTheme(t.key as TickerTheme)}
                aria-pressed={theme === t.key}
                className={`flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium transition ${
                  theme === t.key
                    ? 'border-plum-700 bg-plum-50 text-plum-900 ring-2 ring-plum-300'
                    : 'border-cream-300 bg-surface text-ink-600 hover:border-plum-300'
                }`}
              >
                <span
                  aria-hidden
                  className="inline-block h-4 w-4 rounded-full border border-black/10"
                  style={{ backgroundColor: t.swatch }}
                />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Homepage headline */}
        <div className="border-t border-cream-200 pt-6">
          <div className="mb-1.5 flex items-baseline justify-between">
            <label htmlFor="hero" className="block text-sm font-medium text-ink-700">
              Homepage headline
            </label>
            <span className={`text-xs ${hero.split('\n').filter((l) => l.trim()).length > MAX_HERO_LINES ? 'text-red-600' : 'text-ink-400'}`}>
              up to {MAX_HERO_LINES} lines
            </span>
          </div>
          <textarea
            id="hero"
            value={hero}
            onChange={(e) => setHero(e.target.value)}
            rows={3}
            placeholder={'Symbolic "jewelry"\nfor the bond\nthat "lasts"'}
            className="input-base resize-y"
          />
          <p className="mt-1.5 text-xs text-ink-500">
            One line = one row of the big headline. Put words in{' '}
            <span className="font-mono text-plum-700">&ldquo;quotes&rdquo;</span> to make them purple — e.g.{' '}
            <span className="font-mono text-plum-700">that &quot;lasts&quot;</span>. The font stays exactly as it is.
          </p>
          {/* Live preview — the real headline component with the unsaved text */}
          <div className="mt-3 overflow-x-auto rounded-lg border border-cream-300 bg-cream-50 px-4 py-8 text-center">
            <HeroHeadline raw={hero} />
          </div>
        </div>

        {/* Publish toggle */}
        <label className="flex items-center gap-3 text-sm text-ink-700">
          <input
            type="checkbox"
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
            className="h-4 w-4 accent-plum-700"
          />
          Show the ticker on the site
          <span className="text-xs text-ink-400">(off = banner hidden everywhere)</span>
        </label>

        {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
        {success && <p className="text-sm text-plum-700" role="status">{success}</p>}

        <div className="flex justify-end">
          <button onClick={handleSubmit} disabled={pending} className="btn-plum px-6 py-2.5 text-sm">
            {pending ? 'Saving…' : 'Save ticker'}
          </button>
        </div>
      </div>
    </div>
  );
}
