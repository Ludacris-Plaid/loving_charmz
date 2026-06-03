'use client';

import { useState, useTransition } from 'react';
import { updateEmailPreferencesAction } from '@/lib/wishlist/actions';

type Props = {
  defaultOrderUpdates: boolean;
  defaultMarketingEmails: boolean;
};

export function SettingsForm({ defaultOrderUpdates, defaultMarketingEmails }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = (formData: FormData) => {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const res = await updateEmailPreferencesAction(formData);
      if (res.error) setError(res.error);
      else {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 2500);
      }
    });
  };

  return (
    <section className="surface-card p-6">
      <h2 className="font-display text-lg font-semibold text-plum-900 mb-4">Email preferences</h2>
      <form action={handleSubmit} className="space-y-4">
        <label className="flex items-center justify-between gap-4 cursor-pointer">
          <div>
            <p className="text-sm text-ink-700">Order updates</p>
            <p className="text-xs text-ink-500">Status changes, shipping confirmations, and delivery notifications.</p>
          </div>
          <input
            type="checkbox"
            name="order_updates"
            defaultChecked={defaultOrderUpdates}
            className="h-5 w-5 accent-plum-700"
          />
        </label>
        <label className="flex items-center justify-between gap-4 cursor-pointer">
          <div>
            <p className="text-sm text-ink-700">Marketing emails</p>
            <p className="text-xs text-ink-500">Occasional stories, new pieces, and keepsake ideas.</p>
          </div>
          <input
            type="checkbox"
            name="marketing_emails"
            defaultChecked={defaultMarketingEmails}
            className="h-5 w-5 accent-plum-700"
          />
        </label>

        {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
        {success && <p className="text-sm text-plum-700" role="status">Preferences saved.</p>}

        <button type="submit" disabled={pending} className="btn-plum px-5 py-2 text-xs">
          {pending ? 'Saving…' : 'Save preferences'}
        </button>
      </form>
    </section>
  );
}
