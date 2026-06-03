'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { signup } from '@/lib/auth/actions';

export function SignupForm() {
  const params = useSearchParams();
  const next = params.get('next') || '/account';
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      try {
        await signup(formData);
      } catch (e) {
        setError((e as Error).message || 'Sign up failed. Please try again.');
      }
    });
  };

  return (
    <form action={handleSubmit} className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-plum-900">Create your account</h1>
        <p className="mt-2 text-sm text-ink-600">Join us and start your keepsake journey.</p>
      </div>

      {error && (
        <p className="text-sm text-red-600" role="alert">{error}</p>
      )}

      <div className="space-y-4">
        <Input
          id="username"
          name="username"
          type="text"
          label="Username"
          required
          autoComplete="username"
          placeholder="yourname"
        />
        <Input
          id="email"
          name="email"
          type="email"
          label="Email"
          required
          autoComplete="email"
          placeholder="you@example.com"
        />
        <Input
          id="password"
          name="password"
          type="password"
          label="Password"
          required
          autoComplete="new-password"
          placeholder="••••••••"
          hint="At least 8 characters."
        />
      </div>

      <input type="hidden" name="next" value={next} />

      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="btn-plum inline-flex w-full items-center justify-center gap-2 py-3 text-sm"
      >
        {pending && <Spinner size="sm" />}
        {pending ? 'Creating account…' : 'Create account'}
      </button>

      <p className="text-center text-sm text-ink-600">
        Already have an account?{' '}
        <Link
          href={`/login?next=${encodeURIComponent(next)}`}
          className="font-medium text-plum-700 hover:text-plum-900 motion-base"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
