import Link from 'next/link';
import { logout } from '@/lib/auth/actions';

export const metadata = {
  title: 'Signing out…',
};

export default function LogoutPage() {
  return (
    <div className="flex flex-col items-center justify-center gap-6 text-center">
      <h1 className="font-display text-2xl font-semibold text-plum-900">Sign out of Loving Charmz?</h1>
      <p className="max-w-sm text-sm text-ink-600">
        You can sign back in at any time from the Account menu.
      </p>
      <form action={logout}>
        <button
          type="submit"
          className="btn-plum px-6 py-2.5 text-sm disabled:opacity-50 border border-plum-700"
        >
          Yes, sign out
        </button>
      </form>
      <Link href="/account" className="text-sm font-medium text-plum-700 hover:text-plum-900 motion-base">
        Cancel
      </Link>
    </div>
  );
}
