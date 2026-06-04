'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export type AccountActionResult = { error?: string; success?: boolean };

export async function updateProfileAction(formData: FormData): Promise<AccountActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const display_name = (formData.get('display_name') as string | null)?.trim() || null;
  const bio = (formData.get('bio') as string | null)?.trim() || null;
  const pet_story = (formData.get('pet_story') as string | null)?.trim() || null;
  const is_public = formData.get('is_public') === 'on';

  const { error } = await supabase
    .from('profiles')
    .update({ display_name, bio, pet_story, is_public })
    .eq('id', user.id);

  if (error) return { error: error.message };
  revalidatePath('/account/profile');
  return { success: true };
}

export async function uploadAvatarAction(userId: string, formData: FormData): Promise<AccountActionResult & { url?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== userId) return { error: 'Not authenticated' };

  const file = formData.get('file') as File | null;
  if (!file) return { error: 'No file provided' };

  const admin = createAdminClient();
  const ext = file.name.split('.').pop() || 'png';
  const path = `${userId}/avatar.${ext}`;

  const { error: uploadError } = await admin.storage
    .from('avatars')
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) return { error: uploadError.message };

  const { data: pub } = admin.storage.from('avatars').getPublicUrl(path);
  const url = `${pub.publicUrl}?t=${Date.now()}`;

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: url })
    .eq('id', userId);

  if (updateError) return { error: updateError.message };

  revalidatePath('/account/profile');
  revalidatePath('/', 'layout');
  return { success: true, url };
}
