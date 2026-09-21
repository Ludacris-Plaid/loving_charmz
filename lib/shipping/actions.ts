'use server';

import { getSession } from '@/components/admin/AdminGuard';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendShippingNotification } from '@/lib/email/transactional';
import {
  CanadaPostError,
  createShipment,
  getCpConfig,
  getLabelPdf,
  isCanadaPostConfigured,
  transmitShipments,
  voidShipment,
  type CpShipmentInput,
} from './canadapost';

/**
 * Server actions behind the Orders tab's Canada Post card. Every action is
 * admin-gated and degrades to a friendly message when CP credentials are
 * not configured — the rest of the shop never depends on CP being live.
 */

export type CpActionResult = {
  ok?: boolean;
  error?: string;
  pin?: string;
  priceDue?: number | null;
};

/** Orders whose shipping address is Canadian can use domestic services. */
function addressFromOrder(shippingAddress: unknown): CpShipmentInput['destination'] | null {
  const a = shippingAddress as {
    firstName?: string;
    lastName?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
    email?: string;
  } | null;
  if (!a?.address || !a.city) return null;
  const country = (a.country || 'CA').toUpperCase();
  return {
    name: [a.firstName, a.lastName].filter(Boolean).join(' ') || undefined,
    company: undefined,
    addressLine1: a.address,
    city: a.city,
    province: (a.state || '').toUpperCase(),
    postalCode: a.zip || '',
    countryCode: country,
    phone: undefined,
  };
}

function senderAddress(): CpShipmentInput['sender'] | null {
  const config = getCpConfig();
  if (!config?.originPostal) return null;
  return {
    name: undefined,
    company: 'Loving Charmz',
    phone: process.env.CP_SENDER_PHONE || '5555555555',
    addressLine1: process.env.CP_SENDER_ADDRESS || 'PO Box 1',
    city: process.env.CP_SENDER_CITY || '',
    province: process.env.CP_SENDER_PROVINCE || '',
    postalCode: config.originPostal,
    countryCode: 'CA',
  };
}

export async function createCanadaPostLabelAction(
  orderId: string,
  serviceCode: string,
  weightKg: number,
  notifyEmail?: boolean,
): Promise<CpActionResult> {
  const session = await getSession();
  if (!session?.isAdmin) return { error: 'Admin permission required.' };
  const admin = createAdminClient();

  if (!isCanadaPostConfigured()) {
    return {
      error:
        'Canada Post is not configured. Add CP_API_KEY and CP_CUSTOMER_NUMBER (from the Canada Post Developer Program) to the environment, then redeploy.',
    };
  }

  const { data: order } = await admin
    .from('orders')
    .select('id, shipping_address, customer_email, status, tracking_number')
    .eq('id', orderId)
    .maybeSingle();
  if (!order) return { error: 'Order not found.' };
  if (order.tracking_number) return { error: 'This order already has a tracking number. Void it first to relabel.' };

  const destination = addressFromOrder(order.shipping_address);
  const sender = senderAddress();
  if (!destination) return { error: 'Order has no usable shipping address.' };
  if (!sender) return { error: 'CP_ORIGIN_POSTAL / CP_SENDER_* env values are required to address the sender.' };

  const cfg = getCpConfig()!;
  const input: CpShipmentInput = {
    serviceCode,
    sender,
    destination,
    parcel: { weightKg: Math.max(0.001, weightKg || 0.25) },
    email: notifyEmail ? order.customer_email || (order.shipping_address as any)?.email || undefined : undefined,
    reference: order.id.slice(0, 8).toUpperCase(),
    orderTotalCad: undefined,
  };

  try {
    const res = await createShipment(input);
    const pin = res.pin;
    const links = res.links;
    const price = res.price ? { due: res.price.due } : null;

    if (!pin) return { error: 'Canada Post did not return a tracking PIN. Check the label link in the shipment record.' };

    // Persist the shipment, then run the existing Ship & Notify flow.
    await admin.from('cp_shipments').insert({
      order_id: orderId,
      mode: cfg.mode,
      service_code: serviceCode,
      pin,
      shipment_id: res.shipmentId,
      group_id: null,
      links,
      price: price ?? null,
      status: 'created',
    });

    const { error: shipErr } = await admin
      .from('orders')
      .update({
        status: 'shipped',
        tracking_number: pin,
        tracking_carrier: 'Canada Post',
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);
    if (shipErr) return { error: `Label created but order update failed: ${shipErr.message}` };

    // Ship & Notify: the branded shipping email with the tracking number.
    const email = order.customer_email || (order.shipping_address as any)?.email;
    if (email) {
      await sendShippingNotification({ to: email, orderId, trackingNumber: pin });
    }

    return { ok: true, pin, priceDue: price?.due ?? null };
  } catch (e) {
    if (e instanceof CanadaPostError) return { error: e.message };
    console.error('[canadapost] create label failed', e);
    return { error: 'Canada Post request failed unexpectedly. Check the server logs.' };
  }
}

export async function downloadCanadaPostLabelAction(
  orderId: string,
): Promise<{ ok?: boolean; error?: string; pdfBase64?: string }> {
  const session = await getSession();
  if (!session?.isAdmin) return { error: 'Admin permission required.' };
  const admin = createAdminClient();

  const { data: cp } = await admin
    .from('cp_shipments')
    .select('links, pin, status')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!cp) return { error: 'No Canada Post label for this order.' };

  try {
    const href = cp.links?.label ?? cp.links?.self;
    if (!href) return { error: 'Stored shipment has no label link.' };
    const pdf = await getLabelPdf(href);
    return { ok: true, pdfBase64: pdf.toString('base64') };
  } catch (e) {
    if (e instanceof CanadaPostError) return { error: e.message };
    return { error: 'Label download failed. It may still be rendering — wait a few seconds and retry.' };
  }
}

export async function voidCanadaPostLabelAction(orderId: string): Promise<CpActionResult> {
  const session = await getSession();
  if (!session?.isAdmin) return { error: 'Admin permission required.' };
  const admin = createAdminClient();

  const { data: cp } = await admin
    .from('cp_shipments')
    .select('id, links, status, pin')
    .eq('order_id', orderId)
    .eq('status', 'created')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!cp) return { error: 'No active Canada Post label for this order.' };

  try {
    if (cp.links && Object.keys(cp.links).length > 0) {
      await voidShipment(cp.links);
    }
    await admin.from('cp_shipments').update({ status: 'voided' }).eq('id', cp.id);
    // Clear the order's shipping state so a fresh label can be created.
    await admin
      .from('orders')
      .update({ status: 'processing', tracking_number: null, tracking_carrier: null, updated_at: new Date().toISOString() })
      .eq('id', orderId);
    return { ok: true };
  } catch (e) {
    if (e instanceof CanadaPostError) return { error: e.message };
    return { error: 'Void request failed.' };
  }
}

/**
 * Contract mode: transmit all non-transmitted shipments into a manifest and
 * return the manifest links (mom then prints each manifest PDF).
 */
export async function transmitManifestAction(): Promise<
  { ok?: boolean; error?: string; manifestCount?: number; labelPdfBase64?: string }
> {
  const session = await getSession();
  if (!session?.isAdmin) return { error: 'Admin permission required.' };
  const admin = createAdminClient();

  const cfg = getCpConfig();
  if (!cfg) return { error: 'Canada Post is not configured.' };
  if (cfg.mode !== 'contract') {
    return { error: 'Manifests apply to contract shipping. Non-contract labels are paid individually as printed.' };
  }

  const { data: pending } = await admin
    .from('cp_shipments')
    .select('id, group_id')
    .eq('status', 'created')
    .not('group_id', 'is', null);
  if (!pending || pending.length === 0) {
    return { error: 'No unmanifested contract shipments to transmit.' };
  }

  const groupIds = Array.from(new Set(pending.map((p) => p.group_id).filter(Boolean) as string[]));

  try {
    const { manifestLinks } = await transmitShipments(groupIds);
    await admin
      .from('cp_shipments')
      .update({ status: 'transmitted' })
      .in('id', pending.map((p) => p.id));

    // Best effort: fetch the first manifest PDF for immediate printing.
    let pdf: string | undefined;
    if (manifestLinks[0]) {
      try {
        const buf = await getLabelPdf({ self: manifestLinks[0] });
        pdf = buf.toString('base64');
      } catch {
        // Manifest may take a moment to render; mom can re-fetch later.
      }
    }
    return { ok: true, manifestCount: manifestLinks.length, labelPdfBase64: pdf };
  } catch (e) {
    if (e instanceof CanadaPostError) return { error: e.message };
    return { error: 'Transmit failed.' };
  }
}
