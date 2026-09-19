'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function RedirectOnMissingToken() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/forgot-password?error=Invalid or expired reset link. Please request a new one.');
  }, [router]);

  return (
    <p className="text-sm text-ink-600">Redirecting...</p>
  );
}
