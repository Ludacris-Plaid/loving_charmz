import { Suspense } from 'react';
import { ForgotPasswordForm } from './ForgotPasswordForm';

export const metadata = {
  title: 'Forgot password — Loving Charmz',
};

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
