import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The broadcast composer sends to hostile clients (Gmail, Outlook,
 * PrivateEmail) that strip web fonts, style blocks and `<link>` tags —
 * these tests pin the branding and compliance invariants of the shared
 * email template so a refactor can't silently regress them:
 *
 *  - every email (transactional and broadcast) renders inside the same
 *    branded shell (logo, Caveat wordmark PNG, footer, studio note);
 *  - broadcasts always carry a working per-recipient unsubscribe link,
 *    whether or not the admin remembered to include one;
 *  - the `%%RECIPIENT_EMAIL%%` token is fully consumed per recipient so no
 *    one ever receives a raw template placeholder.
 */

vi.mock('next/headers', () => ({ headers: vi.fn(async () => new Headers()) }));

import {
  BROADCAST_UNSUBSCRIBE_TOKEN,
  escapeHtml,
  renderBroadcastHtml,
  shell,
} from '@/lib/email/template';

const SITE = 'https://lovingcharmz.com';
const UNSUB = `${SITE}/unsubscribe`;

async function render(body: string, unsub = UNSUB) {
  return renderBroadcastHtml({ siteUrl: SITE, bodyHtml: body, unsubscribeUrl: unsub });
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_SITE_URL = SITE;
});

afterEach(() => {
  delete process.env.NEXT_PUBLIC_SITE_URL;
});

describe('shell (shared branded template)', () => {
  it('renders the logo mark and the pre-rendered Caveat wordmark', async () => {
    const html = await shell('<p>x</p>');
    expect(html).toContain(`${SITE}/email/logo.png`);
    expect(html).toContain(`${SITE}/email/wordmark.png`);
    expect(html).toContain('alt="Charmz"');
  });

  it('keeps the live-text "Loving" eyebrow over the wordmark', async () => {
    const html = await shell('<p>x</p>');
    expect(html).toContain('>Loving</span>');
    expect(html).toContain('letter-spacing:5px');
  });

  it('links the header to the shop and includes the standard footer links', async () => {
    const html = await shell('<p>x</p>');
    expect(html).toContain(`href="${SITE}/shop"`);
    expect(html).toContain(`href="${SITE}/faq"`);
    expect(html).toContain(`href="${SITE}/account/orders"`);
    expect(html).toContain('mailto:hello@lovingcharmz.com');
  });

  it('ends with the studio sign-off', async () => {
    const html = await shell('<p>x</p>');
    expect(html).toContain('Sent with care from the Loving Charmz studio.');
  });

  it('is a self-contained document with inline styles and no external stylesheets', async () => {
    const html = await shell('<p>x</p>');
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain("font-family:Georgia,'Times New Roman',serif");
    expect(html).not.toMatch(/<link[^>]+stylesheet/i);
  });

  it('falls back to the production domain when no request scope exists', async () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    const html = await shell('<p>x</p>');
    // No request scope in tests → canonical SITE_URL, not localhost.
    expect(html).toContain('https://');
    expect(html).not.toContain('localhost');
  });
});

describe('renderBroadcastHtml', () => {
  it('wraps the admin body in the full branded shell', async () => {
    const html = await render('<h2>Big news!</h2><p>Our new collection just dropped.</p>');
    expect(html).toContain(`${SITE}/email/logo.png`);
    expect(html).toContain(`${SITE}/email/wordmark.png`);
    expect(html).toContain('<h2>Big news!</h2>');
    expect(html).toContain('Our new collection just dropped.');
  });

  it('appends the mailing-list footer with a per-recipient unsubscribe link', async () => {
    const html = await render('<p>Hello!</p>');
    expect(html).toContain(`href="${UNSUB}?email=%%RECIPIENT_EMAIL%%"`);
    expect(html).toContain("You're receiving this because you signed up at");
  });

  it('substitutes the unsubscribe token when the admin includes it', async () => {
    const html = await render(
      `<p>See you there — sign off at <a href="${BROADCAST_UNSUBSCRIBE_TOKEN}">this link</a>.</p>`,
    );
    expect(html).toContain(`href="${UNSUB}?email=%%RECIPIENT_EMAIL%%"`);
    // The token itself must not leak into the sent HTML.
    expect(html).not.toContain(BROADCAST_UNSUBSCRIBE_TOKEN);
  });

  it('leaves exactly one recipient placeholder for the per-recipient pass', async () => {
    const html = await render('<p>Hello!</p>');
    expect(html.split('%%RECIPIENT_EMAIL%%').length - 1).toBe(1);
  });

  it('trailing slashes on site and unsubscribe URLs do not produce double slashes', async () => {
    const html = await render('<p>x</p>', 'https://lovingcharmz.com/unsubscribe/');
    expect(html).toContain(`${UNSUB}?email=%%RECIPIENT_EMAIL%%`);
    expect(html).not.toContain('/unsubscribe//');
  });

  it('escapes shopper-controlled text used inside email bodies', () => {
    expect(escapeHtml('<img src=x onerror=alert(1)>')).toBe(
      '&lt;img src=x onerror=alert(1)&gt;',
    );
    expect(escapeHtml(`Tom & "Jerry"'s`)).toBe('Tom &amp; &quot;Jerry&quot;&#39;s');
  });
});
