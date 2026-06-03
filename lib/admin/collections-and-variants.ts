'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSession } from '@/components/admin/AdminGuard';

async function requireAdmin() {
  const session = await getSession();
  if (!session?.isAdmin) throw new Error('Admin permission required');
  return createAdminClient();
}

export type CollectionResult = { error?: string; success?: boolean };

export async function upsertCollectionAction(formData: FormData): Promise<CollectionResult> {
  const admin = await requireAdmin();
  const id = (formData.get('id') as string | null)?.trim() || null;
  const name = (formData.get('name') as string | null)?.trim();
  if (!name) return { error: 'Name is required' };
  const slug = (formData.get('slug') as string | null)?.trim() || null;
  if (!slug) return { error: 'Slug is required' };
  const description = (formData.get('description') as string | null)?.trim() || null;
  const image_url = (formData.get('image_url') as string | null)?.trim() || null;
  const sort_order = Number(formData.get('sort_order') || 0);
  const is_active = formData.get('is_active') === 'on';

  if (id) {
    const { error } = await admin
      .from('collections')
      .update({ name, slug, description, image_url, sort_order, is_active })
      .eq('id', id);
    if (error) return { error: error.message };
  } else {
    const { error } = await admin
      .from('collections')
      .insert({ name, slug, description, image_url, sort_order, is_active });
    if (error) return { error: error.message };
  }
  revalidatePath('/admin/collections');
  revalidatePath('/collections');
  return { success: true };
}

export async function deleteCollectionAction(id: string): Promise<CollectionResult> {
  const admin = await requireAdmin();
  const { error } = await admin.from('collections').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/admin/collections');
  return { success: true };
}

export type VariantResult = { error?: string; success?: boolean };

export async function upsertVariantAction(
  productId: string,
  formData: FormData
): Promise<VariantResult> {
  const admin = await requireAdmin();
  const id = (formData.get('id') as string | null)?.trim() || null;
  const name = (formData.get('name') as string | null)?.trim();
  if (!name) return { error: 'Name is required' };
  const sku = (formData.get('sku') as string | null)?.trim() || null;
  const price_adjustment = Number(formData.get('price_adjustment') || 0);
  const stock_quantity = Number(formData.get('stock_quantity') || 0);
  const is_active = formData.get('is_active') === 'on';

  if (id) {
    const { error } = await admin
      .from('product_variants')
      .update({ name, sku, price_adjustment, stock_quantity, is_active, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return { error: error.message };
  } else {
    const { error } = await admin
      .from('product_variants')
      .insert({ product_id: productId, name, sku, price_adjustment, stock_quantity, is_active });
    if (error) return { error: error.message };
  }
  revalidatePath('/admin/inventory');
  revalidatePath('/admin/products');
  return { success: true };
}

export async function deleteVariantAction(id: string): Promise<VariantResult> {
  const admin = await requireAdmin();
  const { error } = await admin.from('product_variants').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/admin/inventory');
  return { success: true };
}
