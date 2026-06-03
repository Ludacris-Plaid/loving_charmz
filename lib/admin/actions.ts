'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSession } from '@/components/admin/AdminGuard';

export type AdminResult = { error?: string; success?: boolean; id?: string };

type AdminClient = Awaited<ReturnType<typeof createAdminClient>>;

type AdminGuard =
  | { kind: 'admin'; client: AdminClient }
  | { kind: 'error'; error: string };

async function getAdminClient(): Promise<AdminGuard> {
  const session = await getSession();
  if (!session?.isAdmin) {
    return { kind: 'error', error: 'Admin permission required' };
  }
  return { kind: 'admin', client: createAdminClient() };
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

const PRODUCT_IMAGE_BUCKET = 'product-images';
const PRODUCT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const PRODUCT_IMAGE_MIME = new Set(['image/png', 'image/jpeg', 'image/webp']);

function safeName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function extFromMime(mime: string) {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/webp') return 'webp';
  return 'bin';
}

function parseImagesField(raw: FormDataEntryValue | null): string[] {
  if (typeof raw !== 'string' || !raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((u) => typeof u === 'string')) {
      return parsed.filter((u) => u.length > 0);
    }
  } catch {
    /* ignore */
  }
  return [];
}

export async function createProductAction(formData: FormData): Promise<AdminResult> {
  const guard = await getAdminClient();
  if (guard.kind === 'error') return { error: guard.error };
  const client = guard.client;
  const name = (formData.get('name') as string | null)?.trim();
  if (!name) return { error: 'Name is required' };
  const slug = (formData.get('slug') as string | null)?.trim() || slugify(name);
  const base_price = Number(formData.get('base_price') || 0);
  if (!Number.isFinite(base_price) || base_price < 0) return { error: 'Invalid price' };
  const tagline = (formData.get('tagline') as string | null)?.trim() || null;
  const description = (formData.get('description') as string | null)?.trim() || null;
  const is_active = formData.get('is_active') === 'on';
  const is_personalizable = formData.get('is_personalizable') === 'on';
  const images = parseImagesField(formData.get('images'));

  const { data, error } = await client
    .from('products')
    .insert({ name, slug, base_price, tagline, description, is_active, is_personalizable, images })
    .select('id')
    .single();
  if (error) return { error: error.message };

  revalidatePath('/admin/products');
  revalidatePath('/shop');
  return { success: true, id: data.id };
}

export async function updateProductAction(id: string, formData: FormData): Promise<AdminResult> {
  const guard = await getAdminClient();
  if (guard.kind === 'error') return { error: guard.error };
  const client = guard.client;
  const updates: Record<string, unknown> = {};
  const name = formData.get('name') as string | null;
  if (name) updates.name = name.trim();
  const slug = formData.get('slug') as string | null;
  if (slug) updates.slug = slug.trim();
  const price = formData.get('base_price');
  if (price !== null) {
    const n = Number(price);
    if (!Number.isFinite(n) || n < 0) return { error: 'Invalid price' };
    updates.base_price = n;
  }
  const tagline = formData.get('tagline') as string | null;
  if (tagline !== null) updates.tagline = tagline.trim() || null;
  const description = formData.get('description') as string | null;
  if (description !== null) updates.description = description.trim() || null;
  updates.is_active = formData.get('is_active') === 'on';
  updates.is_personalizable = formData.get('is_personalizable') === 'on';
  if (formData.has('images')) {
    updates.images = parseImagesField(formData.get('images'));
  }

  const { error } = await client.from('products').update(updates).eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/admin/products');
  revalidatePath(`/products/${updates.slug || ''}`);
  revalidatePath('/shop');
  return { success: true };
}

export type ImageUploadResult = { url?: string; error?: string };

export async function uploadProductImageAction(file: File, productSlug?: string): Promise<ImageUploadResult> {
  const guard = await getAdminClient();
  if (guard.kind === 'error') return { error: guard.error };
  const client = guard.client;

  if (!file || !(file instanceof File)) return { error: 'No file provided' };
  if (file.size === 0) return { error: 'File is empty' };
  if (file.size > PRODUCT_IMAGE_MAX_BYTES) return { error: 'File too large (max 5MB)' };
  if (!PRODUCT_IMAGE_MIME.has(file.type)) return { error: 'Unsupported type (PNG, JPEG, or WebP only)' };

  const folder = productSlug ? `products/${safeName(productSlug)}` : 'products/draft';
  const filename = `${Date.now()}-${safeName(file.name) || 'image'}.${extFromMime(file.type)}`;
  const path = `${folder}/${filename}`;

  const { error } = await client.storage.from(PRODUCT_IMAGE_BUCKET).upload(path, file, {
    contentType: file.type,
    cacheControl: '31536000',
    upsert: false,
  });
  if (error) return { error: error.message };

  const { data } = client.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl };
}

export async function deleteProductImageAction(url: string): Promise<AdminResult> {
  const guard = await getAdminClient();
  if (guard.kind === 'error') return { error: guard.error };
  const client = guard.client;

  if (!url) return { error: 'No URL provided' };
  const marker = `/${PRODUCT_IMAGE_BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return { error: 'URL does not reference product-images bucket' };
  const path = url.slice(idx + marker.length).split('?')[0];

  const { error } = await client.storage.from(PRODUCT_IMAGE_BUCKET).remove([path]);
  if (error) return { error: error.message };

  revalidatePath('/admin/products');
  return { success: true };
}

export async function deleteProductAction(id: string): Promise<AdminResult> {
  const guard = await getAdminClient();
  if (guard.kind === 'error') return { error: guard.error };
  const client = guard.client;
  const { error } = await client.from('products').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/admin/products');
  revalidatePath('/shop');
  return { success: true };
}

export async function updateOrderStatusAction(orderId: string, status: string): Promise<AdminResult> {
  const guard = await getAdminClient();
  if (guard.kind === 'error') return { error: guard.error };
  const client = guard.client;
  const valid = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
  if (!valid.includes(status)) return { error: 'Invalid status' };
  const { error } = await client
    .from('orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', orderId);
  if (error) return { error: error.message };
  revalidatePath('/admin/orders');
  return { success: true };
}

export async function updateVariantStockAction(variantId: string, stock: number): Promise<AdminResult> {
  const guard = await getAdminClient();
  if (guard.kind === 'error') return { error: guard.error };
  const client = guard.client;
  if (!Number.isFinite(stock) || stock < 0) return { error: 'Invalid stock quantity' };
  const { error } = await client
    .from('product_variants')
    .update({ stock_quantity: stock, updated_at: new Date().toISOString() })
    .eq('id', variantId);
  if (error) return { error: error.message };
  revalidatePath('/admin/inventory');
  return { success: true };
}

export async function updatePersonalizationAction(id: string, formData: FormData): Promise<AdminResult> {
  const guard = await getAdminClient();
  if (guard.kind === 'error') return { error: guard.error };
  const client = guard.client;
  const status = (formData.get('status') as string | null) || 'pending';
  const admin_notes = (formData.get('admin_notes') as string | null)?.trim() || null;
  const { error } = await client
    .from('personalization_requests')
    .update({ status, admin_notes, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/admin/personalization');
  return { success: true };
}

export async function upsertContentBlockAction(formData: FormData): Promise<AdminResult> {
  const guard = await getAdminClient();
  if (guard.kind === 'error') return { error: guard.error };
  const client = guard.client;
  const slug = (formData.get('slug') as string | null)?.trim();
  if (!slug) return { error: 'Slug is required' };
  const title = (formData.get('title') as string | null)?.trim() || null;
  const body = (formData.get('body') as string | null)?.trim() || null;
  const image_url = (formData.get('image_url') as string | null)?.trim() || null;
  const is_published = formData.get('is_published') === 'on';

  const { error } = await client
    .from('content_blocks')
    .upsert({ slug, title, body, image_url, is_published, updated_at: new Date().toISOString() }, { onConflict: 'slug' });
  if (error) return { error: error.message };
  revalidatePath('/admin/content');
  return { success: true };
}

export async function upsertDiscountAction(formData: FormData): Promise<AdminResult> {
  const guard = await getAdminClient();
  if (guard.kind === 'error') return { error: guard.error };
  const client = guard.client;
  const code = ((formData.get('code') as string | null) || '').toUpperCase().trim();
  if (!code) return { error: 'Code is required' };
  const discount_type = formData.get('discount_type') as 'percentage' | 'fixed' | null;
  if (discount_type !== 'percentage' && discount_type !== 'fixed') return { error: 'Invalid type' };
  const discount_value = Number(formData.get('discount_value') || 0);
  if (!Number.isFinite(discount_value) || discount_value <= 0) return { error: 'Invalid value' };
  const min_order_amount = Number(formData.get('min_order_amount') || 0);
  const max_uses = formData.get('max_uses') ? Number(formData.get('max_uses')) : null;
  const is_active = formData.get('is_active') === 'on';

  const { error } = await client
    .from('discounts')
    .upsert(
      { code, discount_type, discount_value, min_order_amount, max_uses, is_active, updated_at: new Date().toISOString() },
      { onConflict: 'code' }
    );
  if (error) return { error: error.message };
  revalidatePath('/admin/discounts');
  return { success: true };
}

export async function deleteDiscountAction(code: string): Promise<AdminResult> {
  const guard = await getAdminClient();
  if (guard.kind === 'error') return { error: guard.error };
  const client = guard.client;
  const { error } = await client.from('discounts').delete().eq('code', code);
  if (error) return { error: error.message };
  revalidatePath('/admin/discounts');
  return { success: true };
}
