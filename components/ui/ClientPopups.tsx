'use client';

import dynamic from 'next/dynamic';

const EmailSignupPopup = dynamic(
  () => import('./EmailSignupPopup').then((m) => m.EmailSignupPopup),
  { ssr: false },
);

export function ClientPopups() {
  return <EmailSignupPopup />;
}
