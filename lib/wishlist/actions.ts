'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/components/admin/AdminGuard';
import { createAdminClient } from '@/lib/supabase/admin';

export type WishlistResult = { error?: string; success?: boolean };

export async function removeWishlistItemAction(wishlistId: string): Promise<WishlistResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Please sign in to manage your wishlist.' };

  const { error } = await supabase
    .from('wishlists')
    .delete()
    .eq('id', wishlistId)
    .eq('user_id', user.id);
  if (error) return { error: error.message };

  revalidatePath('/account/wishlist');
  revalidatePath('/', 'layout');
  return { success: true };
}

export type UpdatePrefsResult = { error?: string; success?: boolean };

export async function updateEmailPreferencesAction(formData: FormData): Promise<UpdatePrefsResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const order_updates = formData.get('order_updates') === 'on';
  const marketing_emails = formData.get('marketing_emails') === 'on';

  const { error } = await supabase
    .from('profiles')
    .update({ order_updates, marketing_emails })
    .eq('id', user.id);
  if (error) return { error: error.message };

  revalidatePath('/account/settings');
  return { success: true };
}

export type UpdateCustomerResult = { error?: string; success?: boolean };

export async function adminUpdateCustomerAction(
  userId: string,
  formData: FormData
): Promise<UpdateCustomerResult> {
  const session = await getSession();
  if (!session?.isAdmin) return { error: 'Admin permission required' };

  const display_name = (formData.get('display_name') as string | null)?.trim() || null;
  const is_public = formData.get('is_public') === 'on';
  const admin = createAdminClient();
  const { error } = await admin
    .from('profiles')
    .update({ display_name, is_public })
    .eq('id', userId);
  if (error) return { error: error.message };

  revalidatePath('/admin/customers');
  return { success: true };
}
