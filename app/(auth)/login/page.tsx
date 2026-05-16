import { login } from '@/lib/auth/actions';
import Link from 'next/link';

export default function LoginPage() {
  return (
    <form className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-obsidian-50">Welcome back</h1>
        <p className="mt-2 text-sm text-obsidian-400">Sign in to your account.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-obsidian-300 mb-2">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="input-gold w-full px-4 py-3 rounded-card"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-obsidian-300 mb-2">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="input-gold w-full px-4 py-3 rounded-card"
            placeholder="••••••••"
          />
        </div>
      </div>

      <button
        type="submit"
        formAction={login}
        className="btn-gold w-full py-3 px-6 rounded-pill text-sm font-semibold uppercase"
      >
        Sign In
      </button>

      <p className="text-center text-sm text-obsidian-400">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="text-gold-500 hover:text-gold-400 font-medium transition-colors">
          Create one
        </Link>
      </p>
    </form>
  );
}