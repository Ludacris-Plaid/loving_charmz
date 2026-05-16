import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="relative mb-10 text-center">
          <div className="absolute inset-0 bg-gold-500/10 blur-3xl rounded-full mx-auto w-32 h-32" />
          <Link href="/" className="relative block">
            <span className="font-display text-3xl font-semibold gold-gradient-text">Loving Charmz</span>
          </Link>
        </div>
        <div className="surface-premium rounded-card p-8 border border-obsidian-700/50">
          {children}
        </div>
      </div>
    </div>
  );
}