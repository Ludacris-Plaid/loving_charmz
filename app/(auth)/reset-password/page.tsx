import { Suspense } from 'react';
import { ResetPasswordForm } from './ResetPasswordForm';
import { RedirectOnMissingToken } from './RedirectOnMissingToken';

export const metadata = {
  title: 'Reset password — Loving Charmz',
};

type Props = {
  searchParams: Promise<{ access_token?: string }>;
};

export default async function ResetPasswordPage({ searchParams }: Props) {
  const { access_token } = await searchParams;

  if (!access_token) {
    return <RedirectOnMissingToken />;
  }

  return (
    <Suspense fallback={null}>
      <ResetPasswordForm accessToken={access_token} />
    </Suspense>
  );
}
