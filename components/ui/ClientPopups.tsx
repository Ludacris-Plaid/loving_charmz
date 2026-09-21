'use client';

import dynamic from 'next/dynamic';

import { MonitoringBeacon } from './MonitoringBeacon';

const EmailSignupPopup = dynamic(
  () => import('./EmailSignupPopup').then((m) => m.EmailSignupPopup),
  { ssr: false },
);

export function ClientPopups() {
  return (
    <>
      <MonitoringBeacon />
      <EmailSignupPopup />
    </>
  );
}
