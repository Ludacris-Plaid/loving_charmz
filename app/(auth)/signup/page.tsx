import { signup } from '@/lib/auth/actions';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

export default function SignupPage() {
  return (
    <form className="space-y-5">
      <div>
        <h1 className="font-display text-xl font-semibold text-brand-800">Create your account</h1>
        <p className="mt-1 text-sm text-brand-600">
          Join Loving Charmz and start your keepsake journey.
        </p>
      </div>

      <Input label="Username" name="username" required autoComplete="username" />
      <Input label="Email" name="email" type="email" required autoComplete="email" />
      <Input label="Password" name="password" type="password" required autoComplete="new-password" />

      <Button type="submit" formAction={signup} className="w-full">
        Create account
      </Button>

      <p className="text-center text-sm text-brand-600">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-brand-700 hover:text-brand-500 transition">
          Sign in
        </Link>
      </p>
    </form>
  );
}
