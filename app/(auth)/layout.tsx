import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 block text-center">
          <span className="font-display text-2xl font-semibold text-brand-700">Loving Charmz</span>
        </Link>
        {children}
      </div>
    </div>
  );
}
