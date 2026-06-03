import Link from 'next/link';
import { Logo } from '@/components/marketing/Logo';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-6 py-12 overflow-hidden">
      <div className="blob-mint -top-32 -left-32 h-96 w-96" aria-hidden />
      <div className="blob-plum -bottom-32 -right-32 h-96 w-96" aria-hidden />
      <div className="relative w-full max-w-sm">
        <div className="mb-10 flex flex-col items-center gap-3">
          <Logo size="lg" as="span" />
          <p className="text-xs uppercase tracking-[0.3em] text-ink-500">Symbolic jewelry</p>
        </div>
        <div className="surface-card p-8">
          {children}
        </div>
        <div className="mt-6 flex items-center justify-center gap-4 text-xs text-ink-500">
          <Link href="/shop" className="hover:text-plum-700 motion-base">
            ← Continue browsing
          </Link>
          <span aria-hidden>·</span>
          <Link href="/about" className="hover:text-plum-700 motion-base">
            About
          </Link>
          <span aria-hidden>·</span>
          <Link href="/" className="hover:text-plum-700 motion-base">
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
