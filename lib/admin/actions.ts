'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSession } from '@/components/admin/AdminGuard';
import { SITE_URL } from '@/lib/site';
import {
  bootstrapCharmVariants,
  bootstrapJewelryVariants,
} from '@/lib/admin/variant-bootstrap';

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
  const kindRaw = (formData.get('kind') as string | null)?.trim();
  const kind = kindRaw === 'charm' ? 'charm' : 'jewelry';

  const { data, error } = await client
    .from('products')
    .insert({ name, slug, base_price, tagline, description, is_active, is_personalizable, images, kind })
    .select('id, slug')
    .single();
  if (error) return { error: error.message };

  // A new product is immediately sellable in every option: charms get the
  // full 2×3 matrix, jewelry gets the three standard materials. Prices use
  // the catalog defaults; stock starts at 0 until the inventory page is filled.
  try {
    if (kind === 'charm') {
      await bootstrapCharmVariants(client, data.id, data.slug || slug);
    } else {
      await bootstrapJewelryVariants(client, data.id, data.slug || slug);
    }
  } catch (e: any) {
    return {
      error: `Product created, but auto-generating variants failed: ${e?.message || 'unknown error'}. Add them on the Inventory page.`,
    };
  }

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
  const kindRaw = (formData.get('kind') as string | null)?.trim();
  if (kindRaw === 'charm' || kindRaw === 'jewelry') updates.kind = kindRaw;
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

  // Read the current row so the public page can be revalidated with the
  // correct slug — the form may not submit one, and revalidating
  // `/products/<undefined>` would leave the live product page stale.
  const { data: current } = await client
    .from('products')
    .select('slug')
    .eq('id', id)
    .single();

  const { error } = await client.from('products').update(updates).eq('id', id);
  if (error) return { error: error.message };

  // A kind switch (jewelry ↔ charm) bootstraps the missing variant shape
  // for the new kind. Idempotent: never touches existing rows or stock.
  if (updates.kind) {
    try {
      const effectiveSlug =
        (typeof updates.slug === 'string' && updates.slug) || current?.slug || '';
      if (updates.kind === 'charm') {
        await bootstrapCharmVariants(client, id, effectiveSlug);
      } else {
        await bootstrapJewelryVariants(client, id, effectiveSlug);
      }
    } catch {
      /* Variant generation is best-effort on edit; the matrix editor can
         fill any gap and the product edit itself has already succeeded. */
    }
  }

  revalidatePath('/admin/products');
  if (typeof current?.slug === 'string' && current.slug) {
    revalidatePath(`/products/${current.slug}`);
  }
  if (typeof updates.slug === 'string' && updates.slug && updates.slug !== current?.slug) {
    // The slug itself changed: the new URL needs its cache primed/busted too.
    revalidatePath(`/products/${updates.slug}`);
  }
  revalidatePath('/shop');
  return { success: true };
}

export type ImageUploadResult = { url?: string; error?: string };

/** Folders inside the product-images bucket that admin uploads may target. */
const SITE_IMAGE_FOLDERS = new Set(['products', 'collections', 'content']);

/**
 * Site-wide image upload for admin surfaces (collections, content blocks,
 * products). Everything lands in the public-read product-images bucket under
 * a per-type folder — no external URLs anywhere in admin forms.
 */
export async function uploadSiteImageAction(file: File, folder = 'products'): Promise<ImageUploadResult> {
  const guard = await getAdminClient();
  if (guard.kind === 'error') return { error: guard.error };
  const client = guard.client;

  if (!file || !(file instanceof File)) return { error: 'No file provided' };
  if (file.size === 0) return { error: 'File is empty' };
  if (file.size > PRODUCT_IMAGE_MAX_BYTES) return { error: 'File too large (max 5MB)' };
  if (!PRODUCT_IMAGE_MIME.has(file.type)) return { error: 'Unsupported type (PNG, JPEG, or WebP only)' };
  if (!SITE_IMAGE_FOLDERS.has(folder)) return { error: 'Unknown image folder' };

  const path = `${folder}/${Date.now()}-${safeName(file.name) || 'image'}.${extFromMime(file.type)}`;

  const { error } = await client.storage.from(PRODUCT_IMAGE_BUCKET).upload(path, file, {
    contentType: file.type,
    cacheControl: '31536000',
    upsert: false,
  });
  if (error) return { error: error.message };

  const { data } = client.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl };
}

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
  revalidatePath('/admin/collections');
  revalidatePath('/admin/content');
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
  const valid = ['pending', 'processing', 'shipped', 'delivered', 'completed', 'cancelled'];
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

const TICKER_SLUG = 'ticker';
const TICKER_THEMES = ['plum', 'plumMint', 'cream', 'rosewood', 'pine'] as const;

/**
 * Saves the ticker configuration (the scrolling banner under the header).
 *
 * Stored in the `content_blocks` row with slug `ticker`: messages as a JSON
 * array in `metadata.messages`, the colour theme key in `metadata.theme`, and
 * the master on/off switch in `is_published`. Emojis are first-class — the
 * body is plain UTF-8 text rendered directly into the banner.
 */
export async function upsertTickerAction(formData: FormData): Promise<AdminResult> {
  const guard = await getAdminClient();
  if (guard.kind === 'error') return { error: guard.error };
  const client = guard.client;

  const raw = (formData.get('messages') as string | null) ?? '';
  const messages = raw
    .split('\n')
    .map((m) => m.trim().slice(0, 140))
    .filter(Boolean);
  if (messages.length === 0) {
    return { error: 'Add at least one message (or unpublish the ticker instead).' };
  }
  if (messages.length > 5) {
    return { error: 'Keep it to 5 messages or fewer — the ticker loops quickly.' };
  }

  const themeRaw = ((formData.get('theme') as string | null) || 'plum').trim();
  const theme = (TICKER_THEMES as readonly string[]).includes(themeRaw) ? themeRaw : 'plum';
  const is_published = formData.get('is_published') === 'on';

  const { error } = await client
    .from('content_blocks')
    .upsert(
      {
        slug: TICKER_SLUG,
        title: 'Site ticker',
        body: null,
        image_url: null,
        metadata: { messages, theme },
        is_published,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'slug' },
    );
  if (error) return { error: error.message };

  revalidatePath('/', 'layout');
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

/* ------------------------------------------------------------------ */
/*  Email broadcast                                                     */
/* ------------------------------------------------------------------ */

type BroadcastResult = { sent?: number; errors?: string[]; error?: string };

export async function sendBroadcastAction(params: {
  subject: string;
  htmlBody: string;
  recipients: string[];
}): Promise<BroadcastResult> {
  const guard = await getAdminClient();
  if (guard.kind === 'error') return { error: guard.error };

  const { sendBroadcast } = await import('@/lib/email/transactional');
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || SITE_URL;

  const result = await sendBroadcast({
    recipients: params.recipients,
    subject: params.subject,
    htmlBody: params.htmlBody,
    unsubscribeUrl: `${siteUrl}/unsubscribe`,
  });

  return result;
}

/* ------------------------------------------------------------------ */
/*  Shipping notification                                               */
/* ------------------------------------------------------------------ */

export async function sendShippingNotificationAction(
  orderId: string,
  trackingNumber?: string,
): Promise<AdminResult> {
  const guard = await getAdminClient();
  if (guard.kind === 'error') return { error: guard.error };
  const client = guard.client;

  const { data: order, error: orderErr } = await client
    .from('orders')
    .select('shipping_address')
    .eq('id', orderId)
    .maybeSingle();

  if (orderErr || !order) return { error: 'Order not found.' };

  const addr = order.shipping_address as any;
  if (!addr?.email) return { error: 'No email address on this order.' };

  const { sendShippingNotification } = await import('@/lib/email/transactional');
  const { error } = await sendShippingNotification({
    to: addr.email,
    orderId,
    trackingNumber,
  });

  if (error) return { error: `Email failed: ${error}` };
  return { success: true };
}

/* ------------------------------------------------------------------ */
/*  Customers — private admin notes                                     */
/* ------------------------------------------------------------------ */

export async function updateCustomerNotesAction(
  customerId: string,
  notes: string,
): Promise<AdminResult> {
  const guard = await getAdminClient();
  if (guard.kind === 'error') return { error: guard.error };
  const client = guard.client;

  // Notes live in a dedicated admin-only table (00019): profiles RLS lets a
  // customer update their own row, so the notes must not live there.
  const { error } = await client
    .from('customer_admin_notes')
    .upsert(
      { user_id: customerId, notes: notes.slice(0, 2000), updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );
  if (error) return { error: error.message };

  revalidatePath('/admin/customers');
  return { success: true };
}

/* ------------------------------------------------------------------ */
/*  Customers — direct one-to-one email                                */
/* ------------------------------------------------------------------ */

export async function emailCustomerAction(params: {
  customerId: string;
  subject: string;
  body: string;
}): Promise<AdminResult> {
  const guard = await getAdminClient();
  if (guard.kind === 'error') return { error: guard.error };
  const client = guard.client;

  const subject = params.subject.trim();
  const body = params.body.trim();
  if (!subject || !body) return { error: 'Subject and message are required.' };

  // Resolve the recipient server-side from the profile — never trust a
  // client-supplied address.
  const { data: authUser } = await client.auth.admin.getUserById(params.customerId);
  const email = authUser?.user?.email;
  if (!email) return { error: 'This customer has no email address on file.' };

  const { sendDirectCustomerEmail } = await import('@/lib/email/transactional');
  const result = await sendDirectCustomerEmail({ to: email, subject, body });
  if (result.error) return { error: `Email failed: ${result.error}` };
  return { success: true };
}

/* ------------------------------------------------------------------ */
/*  Shipping — tracking number                                          */
/* ------------------------------------------------------------------ */

export async function shipOrderAction(
  orderId: string,
  trackingNumber: string,
  carrier?: string,
): Promise<AdminResult> {
  const guard = await getAdminClient();
  if (guard.kind === 'error') return { error: guard.error };
  const client = guard.client;
  if (!trackingNumber.trim()) return { error: 'Tracking number is required.' };
  const { error } = await client
    .from('orders')
    .update({
      status: 'shipped',
      tracking_number: trackingNumber.trim(),
      tracking_carrier: carrier?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId);
  if (error) return { error: error.message };
  revalidatePath('/admin/orders');
  revalidatePath('/account/orders');
  return { success: true };
}

/* ------------------------------------------------------------------ */
/*  Refund — Square full refund                                         */
/* ------------------------------------------------------------------ */

export async function refundOrderAction(orderId: string): Promise<AdminResult> {
  const guard = await getAdminClient();
  if (guard.kind === 'error') return { error: guard.error };
  const client = guard.client;

  // 1. Load the order
  const { data: order, error: orderErr } = await client
    .from('orders')
    .select('id, payment_status, total, payment_method')
    .eq('id', orderId)
    .maybeSingle();
  if (orderErr || !order) return { error: 'Order not found.' };
  if (order.payment_status !== 'paid') return { error: 'Only paid orders can be refunded.' };
  if (order.payment_method !== 'card') return { error: 'Only Square card payments can be refunded through the admin. PayPal refunds must be handled in the PayPal dashboard.' };

  // 2. Find the original payment id from the ledger
  const { findLatestTransaction } = await import('@/lib/payments/ledger');
  const tx = await findLatestTransaction(orderId, 'square');
  const paymentId = tx?.provider_data?.payment_id as string | null;
  if (!paymentId) return { error: 'No Square payment id found for this order.' };

  // 3. Issue the refund via the Square SDK
  try {
    const { createSquareRefund } = await import('@/lib/payments/square');
    const { getSquareConfig } = await import('@/lib/payments/config');
    const config = getSquareConfig();
    if (!config) return { error: 'Square is not configured.' };
    const amountMinor = Math.round(Number(order.total) * 100);
    const result = await createSquareRefund(config, {
      paymentId,
      amountMinor,
      currency: 'CAD',
      orderId,
    });
    if (!result.refundId) {
      return { error: `Square refund failed: ${result.status}` };
    }
  } catch (e: any) {
    return { error: `Square refund failed: ${e?.message || 'unknown error'}` };
  }

  // 4. Mark refunded in the ledger + order
  const { markPaymentRefunded } = await import('@/lib/payments/ledger');
  await markPaymentRefunded({
    orderId,
    provider: 'square',
    reason: 'Admin-initiated full refund',
  });

  await client
    .from('orders')
    .update({ status: 'refunded', updated_at: new Date().toISOString() })
    .eq('id', orderId);

  revalidatePath('/admin/orders');
  revalidatePath('/account/orders');
  revalidatePath('/admin/analytics');
  return { success: true };
}

/* ------------------------------------------------------------------ */
/*  History deletion                                                    */
/* ------------------------------------------------------------------ */

export async function deleteHistoryOrderAction(orderId: string): Promise<AdminResult> {
  const guard = await getAdminClient();
  if (guard.kind === 'error') return { error: guard.error };
  const client = guard.client;
  // Delete order items first, then the order
  await client.from('order_items').delete().eq('order_id', orderId);
  const { error } = await client.from('orders').delete().eq('id', orderId);
  if (error) return { error: error.message };
  revalidatePath('/admin/history');
  return { success: true };
}

export async function deleteAllHistoryAction(): Promise<AdminResult> {
  const guard = await getAdminClient();
  if (guard.kind === 'error') return { error: guard.error };
  const client = guard.client;
  // Get all completed/cancelled order IDs first
  const { data: orders } = await client
    .from('orders')
    .select('id')
    .in('status', ['completed', 'cancelled']);
  if (orders && orders.length > 0) {
    const ids = orders.map((o) => o.id);
    await client.from('order_items').delete().in('order_id', ids);
    const { error } = await client.from('orders').delete().in('id', ids);
    if (error) return { error: error.message };
  }
  revalidatePath('/admin/history');
  return { success: true };
}
