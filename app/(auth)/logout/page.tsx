import { logout } from '@/lib/auth/actions';
import { redirect } from 'next/navigation';

export default async function LogoutPage() {
  await logout();
  redirect('/');
}