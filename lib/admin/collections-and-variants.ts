'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSession } from '@/components/admin/AdminGuard';
import { CHARM_MATERIALS, CHARM_SIZES, variantDisplayName, variantSku } from '@/lib/shop/variants';

async function requireAdmin() {
  const session = await getSession();
  if (!session?.isAdmin) throw new Error('Admin permission required');
  return createAdminClient();
}

export type CollectionResult = { error?: string; success?: boolean };

/**
 * Reads the chosen product ids from the form. They arrive as a JSON array of
 * uuids in the order the admin arranged them — that order becomes the
 * storefront's display order for the collection.
 */
function parseProductIds(formData: FormData): string[] {
  const raw = (formData.get('productIds') as string | null)?.trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === 'string' && v.length > 0);
  } catch {
    return [];
  }
}

/** Replaces a collection's products with exactly `productIds`, in order. */
async function syncCollectionProducts(
  admin: Awaited<ReturnType<typeof createAdminClient>>,
  collectionId: string,
  productIds: string[],
): Promise<string | null> {
  // A stale member left behind would still show on the storefront, so the
  // membership is rebuilt from scratch rather than diffed. The catalog is a
  // handful of rows — clearing and re-adding is cheaper than any merge logic
  // and can never leave a product in the collection twice or out of order.
  const { error: clearError } = await admin
    .from('collection_products')
    .delete()
    .eq('collection_id', collectionId);
  if (clearError) return clearError.message;

  if (productIds.length > 0) {
    const rows = productIds.map((productId, index) => ({
      collection_id: collectionId,
      product_id: productId,
      sort_order: index,
    }));
    const { error } = await admin.from('collection_products').insert(rows);
    if (error) return error.message;
  }
  return null;
}

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
  const productIds = parseProductIds(formData);

  let collectionId = id;
  if (id) {
    const { error } = await admin
      .from('collections')
      .update({ name, slug, description, image_url, sort_order, is_active })
      .eq('id', id);
    if (error) return { error: error.message };
  } else {
    const { data, error } = await admin
      .from('collections')
      .insert({ name, slug, description, image_url, sort_order, is_active })
      .select('id')
      .single();
    if (error) return { error: error.message };
    collectionId = data.id;
  }

  const productsError = await syncCollectionProducts(admin, collectionId!, productIds);
  if (productsError) return { error: productsError };

  revalidatePath('/admin/collections');
  revalidatePath('/collections');
  revalidatePath(`/collections/${slug}`);
  revalidatePath('/shop');
  return { success: true };
}

export async function deleteCollectionAction(id: string): Promise<CollectionResult> {
  const admin = await requireAdmin();
  const { error } = await admin.from('collections').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/admin/collections');
  return { success: true };
}

// ============================================================
// Matrix editor — the one stock surface (brass/steel × S/M/L)
// ============================================================

export type MatrixRowInput = {
  material: string;
  size: string | null;
  stock_quantity: number;
  price_adjustment: number;
  is_active: boolean;
};

export type MatrixSaveResult = { error?: string; success?: boolean };

/**
 * Saves a product's whole variant matrix in one call: upserts each
 * material/size row, generating the display name and SKU from the product
 * slug when a row is new. Rows are validated before anything is written, and
 * existing rows are updated in place — stock and ids are never disturbed
 * beyond what the admin typed.
 */
export async function saveVariantMatrixAction(
  productId: string,
  rows: MatrixRowInput[],
): Promise<MatrixSaveResult> {
  const admin = await requireAdmin();

  const { data: product } = await admin
    .from('products')
    .select('slug, kind')
    .eq('id', productId)
    .maybeSingle();
  if (!product) return { error: 'Product not found' };

  // Validate every row before writing anything so a save is all-or-nothing
  // at the input level.
  for (const r of rows) {
    if (!CHARM_MATERIALS.includes(r.material as never)) {
      return { error: `Unknown material: ${r.material}` };
    }
    if (!r.size || !CHARM_SIZES.includes(r.size as never)) {
      return { error: `Unknown size: ${r.size}` };
    }
    if (!Number.isFinite(r.stock_quantity) || r.stock_quantity < 0) {
      return { error: 'Stock must be a number, zero or more' };
    }
    if (!Number.isFinite(r.price_adjustment) || r.price_adjustment < 0) {
      return { error: 'Price adjustment must be a number, zero or more' };
    }
  }

  const { data: existing } = await admin
    .from('product_variants')
    .select('id, material, size')
    .eq('product_id', productId);
  const idByKey = new Map(
    (existing || []).map((v: any) => [`${v.material}|${v.size}`, v.id as string]),
  );

  for (const r of rows) {
    const name = variantDisplayName(r.material, r.size || null);
    const sku = variantSku(product.slug || 'ITEM', r.material, r.size || null);
    const values = {
      name,
      sku,
      price_adjustment: +Number(r.price_adjustment).toFixed(2),
      stock_quantity: Math.round(r.stock_quantity),
      is_active: r.is_active,
      updated_at: new Date().toISOString(),
    };
    const existingId = idByKey.get(`${r.material}|${r.size || null}`);
    const { error } = existingId
      ? await admin.from('product_variants').update(values).eq('id', existingId)
      : await admin
          .from('product_variants')
          .insert({
            product_id: productId,
            ...values,
            material: r.material,
            size: r.size || null,
          });
    if (error) return { error: error.message };
  }

  revalidatePath('/admin/inventory');
  revalidatePath('/admin/products');
  revalidatePath('/shop');
  return { success: true };
}
