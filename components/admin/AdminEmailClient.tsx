'use client';

import { useState, useTransition } from 'react';
import { sendBroadcastAction } from '@/lib/admin/actions';
import { Input } from '@/components/ui/Input';

type Props = {
  subscribers: string[];
};

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
            placeholder={`<h2>Big news!</h2>\n<p>We just launched our new collection...</p>`}
            className="w-full rounded-md border border-cream-300 bg-white px-4 py-3 text-sm text-ink-800 placeholder:text-ink-400 focus:border-plum-500 focus:outline-none focus:ring-2 focus:ring-plum-500/20 font-mono"
          />
          <p className="mt-1 text-xs text-ink-500">
            You can use HTML tags like &lt;h2&gt;, &lt;p&gt;, &lt;a&gt;, &lt;strong&gt; for formatting. Plain text also works.
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

      {/* Preview */}
      {showPreview && (
        <div className="surface-card p-6">
          <h3 className="text-sm font-medium text-ink-600 mb-3">Email preview</h3>
          <div
            className="rounded-md border border-cream-300 bg-white p-6 prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{
              __html: body || '<p style="color:#999;">Nothing to preview yet...</p>',
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
