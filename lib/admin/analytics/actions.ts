'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSession } from '@/components/admin/AdminGuard';

async function requireAdmin() {
  const session = await getSession();
  if (!session?.isAdmin) throw new Error('Forbidden');
  return session;
}

export async function updateOrderStatusAction(orderId: string, status: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireAdmin();
    const admin = createAdminClient();
    const { error } = await admin
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', orderId);
    if (error) return { ok: false, error: error.message };
    revalidatePath('/admin/analytics');
    revalidatePath('/admin/orders');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function updatePaymentStatusAction(orderId: string, status: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireAdmin();
    const admin = createAdminClient();
    const { error } = await admin
      .from('orders')
      .update({ payment_status: status, updated_at: new Date().toISOString() })
      .eq('id', orderId);
    if (error) return { ok: false, error: error.message };
    revalidatePath('/admin/analytics');
    revalidatePath('/admin/orders');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function adjustStockAction(
  variantId: string,
  newQuantity: number,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireAdmin();
    if (!Number.isFinite(newQuantity) || newQuantity < 0) {
      return { ok: false, error: 'Stock must be a non-negative number.' };
    }
    const admin = createAdminClient();
    const { error } = await admin
      .from('product_variants')
      .update({ stock_quantity: Math.round(newQuantity), updated_at: new Date().toISOString() })
      .eq('id', variantId);
    if (error) return { ok: false, error: error.message };
    revalidatePath('/admin/analytics');
    revalidatePath('/admin/inventory');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function toggleDiscountAction(discountId: string, isActive: boolean): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireAdmin();
    const admin = createAdminClient();
    const { error } = await admin
      .from('discounts')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', discountId);
    if (error) return { ok: false, error: error.message };
    revalidatePath('/admin/analytics');
    revalidatePath('/admin/discounts');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function createAnnotationAction(
  input: { annotation_date: string; title: string; body?: string; color?: string },
): Promise<{ ok: boolean; error?: string; id?: string }> {
  try {
    await requireAdmin();
    if (!input.title.trim()) return { ok: false, error: 'Title is required.' };
    if (!input.annotation_date) return { ok: false, error: 'Date is required.' };
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('analytics_annotations')
      .insert({
        annotation_date: input.annotation_date,
        title: input.title.trim(),
        body: input.body?.trim() || null,
        color: input.color || 'plum',
      })
      .select('id')
      .single();
    if (error) return { ok: false, error: error.message };
    revalidatePath('/admin/analytics');
    return { ok: true, id: data?.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function deleteAnnotationAction(id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireAdmin();
    const admin = createAdminClient();
    const { error } = await admin.from('analytics_annotations').delete().eq('id', id);
    if (error) return { ok: false, error: error.message };
    revalidatePath('/admin/analytics');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}
