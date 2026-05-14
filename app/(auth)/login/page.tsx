import { login } from '@/lib/auth/actions';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

export default function LoginPage() {
  return (
    <form className="space-y-5">
      <div>
        <h1 className="font-display text-xl font-semibold text-brand-800">Welcome back</h1>
        <p className="mt-1 text-sm text-brand-600">Sign in to your Loving Charmz account.</p>
      </div>

      <Input label="Email" name="email" type="email" required autoComplete="email" />
      <Input label="Password" name="password" type="password" required autoComplete="current-password" />

      <Button type="submit" formAction={login} className="w-full">
        Sign in
      </Button>

      <p className="text-center text-sm text-brand-600">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="font-medium text-brand-700 hover:text-brand-500 transition">
          Create one
        </Link>
      </p>
    </form>
  );
}
