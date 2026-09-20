'use client';

import { useState, useTransition } from 'react';
import { sendBroadcastAction } from '@/lib/admin/actions';
import { Input } from '@/components/ui/Input';

type Props = {
  subscribers: string[];
};

/**
 * Admin broadcast composer. The admin writes body-only HTML (headings,
 * paragraphs, buttons); the actual send wraps that body in the same branded
 * template as every other Loving Charmz email. The preview below renders the
 * body against a static copy of that template so what you see is what
 * subscribers get.
 */
export function AdminEmailClient({ subscribers }: Props) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [result, setResult] = useState<{ sent?: number; errors?: string[]; error?: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [showPreview, setShowPreview] = useState(false);

  function handleSend() {
    if (!subject.trim() || !body.trim()) return;
    setResult(null);
    startTransition(async () => {
      const res = await sendBroadcastAction({ subject, htmlBody: body, recipients: subscribers });
      setResult(res);
    });
  }

  return (
    <div className="space-y-6">
      {/* Compose */}
      <div className="surface-card p-6 space-y-4">
        <Input
          id="subject"
          label="Subject line"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="e.g. New collection just dropped!"
        />

        <div>
          <label htmlFor="body" className="block text-sm font-medium text-ink-700 mb-1">
            Email body (HTML allowed)
          </label>
          <textarea
            id="body"
            rows={12}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={`<h2>Big news!</h2>\n<p>We just launched our new collection...</p>\n<p style="text-align:center;margin:24px 0;"><a href="https://lovingcharmz.com/shop" style="display:inline-block;background:#2d1b4e;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;">SHOP NOW</a></p>`}
            className="w-full rounded-md border border-cream-300 bg-white px-4 py-3 text-sm text-ink-800 placeholder:text-ink-400 focus:border-plum-500 focus:outline-none focus:ring-2 focus:ring-plum-500/20 font-mono"
          />
          <p className="mt-1 text-xs text-ink-500">
            Write the <strong>inner content</strong> only — your message is wrapped in the same branded template as
            every other Loving Charmz email (logo header, script wordmark, footer) automatically. Useful tags:
            &lt;h2&gt;, &lt;p&gt;, &lt;a&gt;, &lt;strong&gt;, &lt;img&gt;. Plain text also works.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="btn-outline px-4 py-2 text-sm"
            type="button"
          >
            {showPreview ? 'Hide preview' : 'Preview'}
          </button>
          <button
            onClick={handleSend}
            disabled={isPending || !subject.trim() || !body.trim() || subscribers.length === 0}
            className="btn-plum px-6 py-2 text-sm disabled:opacity-50"
            type="button"
          >
            {isPending ? 'Sending...' : `Send to ${subscribers.length} subscriber${subscribers.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>

      {/* Preview — static replica of lib/email/template.ts so the preview
          shows the real branding (logo, wordmark, footer) around the body.
          The unsubscribe link is a dead demo (#) in previews; real sends
          point it at /unsubscribe with the recipient's address. */}
      {showPreview && (
        <div className="surface-card p-6">
          <h3 className="text-sm font-medium text-ink-600 mb-3">Email preview</h3>
          <div
            className="rounded-md border border-cream-300 bg-white overflow-hidden max-w-none"
            dangerouslySetInnerHTML={{
              __html: renderPreviewHtml(body),
            }}
          />
        </div>
      )}

      {/* Result */}
      {result && (
        <div className={`surface-card p-6 ${result.error ? 'border-red-300' : 'border-mint-300'}`}>
          {result.error ? (
            <p className="text-sm text-red-600">❌ {result.error}</p>
          ) : (
            <div>
              <p className="text-sm text-green-700 font-medium">
                ✅ Sent to {result.sent} subscriber{result.sent !== 1 ? 's' : ''}
              </p>
              {result.errors && result.errors.length > 0 && (
                <p className="text-sm text-orange-600 mt-1">
                  ⚠️ Some batches failed: {result.errors.join(', ')}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {subscribers.length === 0 && (
        <div className="surface-card p-6 text-center">
          <p className="text-sm text-ink-500">
            No subscribers yet. People will appear here once they sign up through the welcome pop-up.
          </p>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Preview renderer                                                   */
/* ------------------------------------------------------------------ */

const PREVIEW_SITE = 'https://lovingcharmz.com';

/**
 * Client-side replica of the branded email shell used at send time
 * (lib/email/template.ts). Kept in sync by hand — if you change the send
 * template, mirror the changes here so previews stay honest.
 */
function renderPreviewHtml(body: string): string {
  const trimmed = body.trim();
  const content = trimmed
    ? trimmed
    : '<p style="color:#999;font-family:Georgia,serif;">Nothing to preview yet...</p>';

  return `<div style="background:#faf8f5;padding:24px 8px;font-family:Georgia,'Times New Roman',serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#faf8f5;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;">
  <tr><td style="background:#2d1b4e;padding:26px 32px 24px;text-align:center;">
    <img src="${PREVIEW_SITE}/email/logo.png" width="72" height="72" alt="Loving Charmz logo" style="display:block;margin:0 auto 10px;">
    <span style="display:block;margin:0 0 2px;font-size:11px;color:#e8d5f5;letter-spacing:5px;text-transform:uppercase;">Loving</span>
    <img src="${PREVIEW_SITE}/email/wordmark.png" width="118" height="55" alt="Charmz" style="display:block;margin:0 auto;">
  </td></tr>
  <tr><td style="padding:32px;">
${content}
  </td></tr>
  <tr><td style="background:#f5f0f7;padding:24px 32px;text-align:center;font-size:12px;color:#6b5b7b;">
    <p style="margin:0 0 8px;">Loving Charmz &mdash; Symbolic keepsake jewelry</p>
    <p style="margin:0 0 8px;">
      <a href="${PREVIEW_SITE}" style="color:#6b5b7b;">lovingcharmz.com</a>
      &nbsp;&middot;&nbsp;
      <a href="${PREVIEW_SITE}/shop" style="color:#6b5b7b;">Shop</a>
      &nbsp;&middot;&nbsp;
      <a href="${PREVIEW_SITE}/faq" style="color:#6b5b7b;">FAQ</a>
      &nbsp;&middot;&nbsp;
      <a href="mailto:hello@lovingcharmz.com" style="color:#6b5b7b;">Contact</a>
    </p>
    <p style="margin:0;color:#9b8fae;">Sent with care from the Loving Charmz studio.</p>
    <p style="margin:12px 0 0;padding-top:12px;border-top:1px solid #e5ddef;font-size:11px;color:#999;">
      You're receiving this because you signed up at ${PREVIEW_SITE}. &nbsp;<a href="#" style="color:#999;">Unsubscribe</a>
    </p>
  </td></tr>
</table>
</td></tr>
</table>
</div>`;
}
