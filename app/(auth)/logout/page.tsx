'use client';

import { useEffect } from 'react';
import { logout } from '@/lib/auth/actions';
import { useRouter } from 'next/navigation';

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    logout().then(() => {
      router.push('/');
    }).catch(() => {
      router.push('/');
    });
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="spinner-dots mb-4">
          <span></span><span></span><span></span>
        </div>
        <p className="text-obsidian-400">Signing out...</p>
      </div>
    </div>
  );
}