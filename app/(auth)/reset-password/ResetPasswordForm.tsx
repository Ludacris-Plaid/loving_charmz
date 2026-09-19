'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { resetPasswordAction } from '@/lib/auth/actions';

export function ResetPasswordForm({ accessToken }: { accessToken: string }) {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError('');
    setSuccess('');
    setLoading(true);

    const password = formData.get('password') as string;
    const confirm = formData.get('confirm') as string;
    if (password !== confirm) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      setLoading(false);
      return;
    }

    try {
      const result = await resetPasswordAction(accessToken, password);
      if (result.error) setError(result.error);
      else setSuccess('Password updated! Redirecting to sign in...');
    } catch {
      setError('Something went wrong. The link may have expired.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-plum-900">New password</h1>
        <p className="mt-2 text-sm text-ink-600">Choose a new password for your account.</p>
      </div>

      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
      {success && <p className="text-sm text-green-600" role="status">{success}</p>}

      <div className="space-y-4">
        <Input
          id="password"
          name="password"
          type="password"
          label="New password"
          required
          minLength={6}
          autoComplete="new-password"
          placeholder="••••••••"
        />
        <Input
          id="confirm"
          name="confirm"
          type="password"
          label="Confirm password"
          required
          minLength={6}
          autoComplete="new-password"
          placeholder="••••••••"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="btn-plum inline-flex w-full items-center justify-center gap-2 py-3 text-sm disabled:opacity-50"
      >
        {loading ? 'Updating...' : 'Update password'}
      </button>
    </form>
  );
}
