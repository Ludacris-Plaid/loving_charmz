'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { forgotPasswordAction } from '@/lib/auth/actions';

export function ForgotPasswordForm() {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const result = await forgotPasswordAction(formData);
      if (result.error) setError(result.error);
      else setSuccess(result.message || 'Check your email for a password reset link.');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-plum-900">Reset password</h1>
        <p className="mt-2 text-sm text-ink-600">
          Enter your email and we&rsquo;ll send you a link to reset your password.
        </p>
      </div>

      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
      {success && <p className="text-sm text-green-600" role="status">{success}</p>}

      <div>
        <Input
          id="email"
          name="email"
          type="email"
          label="Email"
          required
          autoComplete="email"
          placeholder="you@example.com"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="btn-plum inline-flex w-full items-center justify-center gap-2 py-3 text-sm disabled:opacity-50"
      >
        {loading ? 'Sending...' : 'Send reset link'}
      </button>

      <p className="text-center text-sm text-ink-600">
        Remember your password?{' '}
        <a href="/login" className="font-medium text-plum-700 hover:text-plum-900 motion-base">
          Sign in
        </a>
      </p>
    </form>
  );
}
