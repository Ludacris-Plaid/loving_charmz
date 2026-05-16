'use client';

import { useState } from 'react';
import { signup } from '@/lib/auth/actions';
import Link from 'next/link';

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (formData: FormData) => {
    try {
      setError(null);
      setSuccess(false);
      await signup(formData);
      setSuccess(true);
    } catch (e: any) {
      setError(e.message || 'Signup failed. Please try again.');
    }
  };

  return (
    <form className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-obsidian-50">Create your account</h1>
        <p className="mt-2 text-sm text-obsidian-400">
          Join us and start your keepsake journey.
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-card bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 rounded-card bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm">
          Account created! Redirecting to your account...
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-obsidian-300 mb-2">
            Username
          </label>
          <input
            id="username"
            name="username"
            type="text"
            required
            autoComplete="username"
            className="input-gold w-full px-4 py-3 rounded-card"
            placeholder="yourname"
          />
        </div>
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
            autoComplete="new-password"
            className="input-gold w-full px-4 py-3 rounded-card"
            placeholder="••••••••"
          />
        </div>
      </div>

      <button
        type="submit"
        onClick={(e) => {
          e.preventDefault();
          const form = e.currentTarget.form;
          if (form) handleSubmit(new FormData(form));
        }}
        className="btn-gold w-full py-3 px-6 rounded-pill text-sm font-semibold uppercase"
      >
        Create Account
      </button>

      <p className="text-center text-sm text-obsidian-400">
        Already have an account?{' '}
        <Link href="/login" className="text-gold-500 hover:text-gold-400 font-medium transition-colors">
          Sign in
        </Link>
      </p>
    </form>
  );
}