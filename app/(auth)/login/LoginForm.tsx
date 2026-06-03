'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { login } from '@/lib/auth/actions';

export function LoginForm() {
  const params = useSearchParams();
  const next = params.get('next') || '';
  const error = params.get('error');

  return (
    <form action={login} className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-plum-900">Welcome back</h1>
        <p className="mt-2 text-sm text-ink-600">Sign in to your account.</p>
      </div>

      {error && (
        <p className="text-sm text-red-600" role="alert">{error}</p>
      )}

      <div className="space-y-4">
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
          autoComplete="current-password"
          placeholder="••••••••"
        />
      </div>

      <input type="hidden" name="next" value={next} />

      <button
        type="submit"
        className="btn-plum inline-flex w-full items-center justify-center gap-2 py-3 text-sm"
      >
        Sign in
      </button>

      <p className="text-center text-sm text-ink-600">
        Don&rsquo;t have an account?{' '}
        <Link
          href={`/signup${next ? `?next=${encodeURIComponent(next)}` : ''}`}
          className="font-medium text-plum-700 hover:text-plum-900 motion-base"
        >
          Create one
        </Link>
      </p>
    </form>
  );
}
