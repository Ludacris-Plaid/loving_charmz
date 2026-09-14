'use client';

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'lc_email_signup_dismissed';
const COUPON_CODE = 'WELCOME10';

export function EmailSignupPopup() {
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed) return;
    const t = setTimeout(() => setVisible(true), 8000);
    return () => clearTimeout(t);
  }, []);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, '1');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus('success');
  };

  const copyCode = async () => {
    await navigator.clipboard.writeText(COUPON_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-[fade-in_0.3s_ease-out]"
        onClick={dismiss}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-pop animate-[scale-in_0.35s_var(--motion-ease-bounce)]">
        {/* Close button */}
        <button
          onClick={dismiss}
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-ink-500 hover:text-plum-900 motion-base"
          aria-label="Close"
        >
          ✕
        </button>

        {/* Header with gradient */}
        <div className="bg-gradient-to-br from-plum-700 to-plum-900 px-8 py-10 text-center text-white">
          <span className="inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider">
            Welcome gift
          </span>
          <h2 className="font-display mt-4 text-3xl font-semibold">
            10% off your first order
          </h2>
          <p className="mt-2 text-white/80 text-sm">
            Sign up for our mailing list and receive a welcome coupon.
          </p>
        </div>

        {/* Body */}
        <div className="px-8 py-6">
          {status === 'success' ? (
            <div className="text-center">
              <p className="text-plum-900 font-medium mb-4">
                🎉 Here&apos;s your coupon code:
              </p>
              <div className="flex items-center justify-center gap-3 mb-6">
                <span className="inline-block rounded-lg border-2 border-dashed border-plum-300 bg-plum-50 px-6 py-3 font-mono text-xl font-bold text-plum-800 tracking-wider">
                  {COUPON_CODE}
                </span>
                <button
                  onClick={copyCode}
                  className="btn-outline px-3 py-2 text-xs"
                >
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <p className="text-sm text-ink-600 mb-4">
                Enter this code at checkout to receive <strong>10% off</strong> your order.
              </p>
              <button
                onClick={dismiss}
                className="btn-plum w-full px-6 py-3 text-sm"
              >
                Start shopping
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="popup-email" className="block text-sm font-medium text-ink-700 mb-1.5">
                  Email address
                </label>
                <input
                  id="popup-email"
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-base"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                className="btn-plum w-full px-6 py-3 text-sm"
              >
                Get my 10% off
              </button>
              <p className="text-xs text-center text-ink-500">
                No spam, ever. Unsubscribe anytime.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
