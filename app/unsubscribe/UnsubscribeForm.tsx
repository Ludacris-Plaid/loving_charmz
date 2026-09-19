'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { unsubscribeAction } from '@/lib/subscribers/actions';

type Props = {
  defaultEmail: string;
};

export function UnsubscribeForm({ defaultEmail }: Props) {
  const [email, setEmail] = useState(defaultEmail);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; error?: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const res = await unsubscribeAction(email.trim());
      setResult(res);
    } catch {
      setResult({ error: 'Something went wrong.' });
    } finally {
      setLoading(false);
    }
  }

  if (result?.success) {
    return (
      <div className="surface-card p-6">
        <p className="text-sm text-green-700 font-medium">
          ✅ You&rsquo;ve been unsubscribed. You won&rsquo;t receive any more emails from us.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {result?.error && <p className="text-sm text-red-600">{result.error}</p>}
      <Input
        id="email"
        label="Email address"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        placeholder="you@example.com"
      />
      <button
        type="submit"
        disabled={loading || !email.trim()}
        className="btn-plum w-full py-2.5 text-sm disabled:opacity-50"
      >
        {loading ? 'Unsubscribing...' : 'Unsubscribe'}
      </button>
    </form>
  );
}
