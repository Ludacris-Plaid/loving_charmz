import { Suspense } from 'react';
import { SignupForm } from './SignupForm';

export const metadata = {
  title: 'Create account — Loving Charmz',
};

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  );
}
