'use server';

import { createClient } from '@/lib/supabase/server';

export type ReferenceUploadResult = { url?: string; error?: string };

const BUCKET = 'reference-images';
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/webp']);

function safeName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function extFromMime(mime: string) {
  switch (mime) {
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/jpeg':
    default:
      return 'jpg';
  }
}

/**
 * Uploads a shopper's reference photo for a custom order. Files live in the
 * public-read reference-images bucket under `<user-id>/` so customers can
 * attach an image from their own drive without any URL field existing.
 */
export async function uploadReferenceImageAction(file: File): Promise<ReferenceUploadResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Please sign in to upload a reference image.' };

  if (!file || !(file instanceof File)) return { error: 'No file provided' };
  if (file.size === 0) return { error: 'File is empty' };
  if (file.size > MAX_BYTES) return { error: 'File too large (max 5MB)' };
  if (!ALLOWED_MIME.has(file.type)) return { error: 'Unsupported type (PNG, JPEG, or WebP only)' };

  const path = `${user.id}/${Date.now()}-${safeName(file.name) || 'reference'}.${extFromMime(file.type)}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    cacheControl: '31536000',
    upsert: false,
  });
  if (error) return { error: error.message };

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl };
}
