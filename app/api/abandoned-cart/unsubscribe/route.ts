import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Unsubscribe from abandoned cart emails.
 *
 * Each abandoned-cart email contains a unique unsubscribe link:
 *   /api/abandoned-cart/unsubscribe?token=<hex>
 *
 * Clicking it marks the recipient as unsubscribed so they never
 * receive another abandoned-cart email.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');

  if (!token || token.length < 10) {
    return new NextResponse(
      `<!DOCTYPE html><html><head><title>Invalid link</title></head>
       <body style="font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#faf8f5;">
       <div style="text-align:center;padding:40px;">
         <h1 style="color:#2d1b4e;">Invalid unsubscribe link</h1>
         <p style="color:#6b5b7b;">This link is invalid or has expired.</p>
       </div></body></html>`,
      { status: 400, headers: { 'Content-Type': 'text/html' } },
    );
  }

  const admin = createAdminClient();

  // Find the record by token
  const { data: record, error: findErr } = await admin
    .from('abandoned_cart_emails')
    .select('id, unsubscribed_at')
    .eq('unsubscribe_token', token)
    .maybeSingle();

  if (findErr || !record) {
    return new NextResponse(
      `<!DOCTYPE html><html><head><title>Not found</title></head>
       <body style="font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#faf8f5;">
       <div style="text-align:center;padding:40px;">
         <h1 style="color:#2d1b4e;">Link not found</h1>
         <p style="color:#6b5b7b;">This unsubscribe link is invalid or has already been used.</p>
       </div></body></html>`,
      { status: 404, headers: { 'Content-Type': 'text/html' } },
    );
  }

  // Already unsubscribed — show success anyway
  if (record.unsubscribed_at) {
    return successPage();
  }

  // Mark as unsubscribed
  const { error: updateErr } = await admin
    .from('abandoned_cart_emails')
    .update({ unsubscribed_at: new Date().toISOString() })
    .eq('id', record.id);

  if (updateErr) {
    console.error('[unsubscribe]', updateErr);
    return new NextResponse(
      `<!DOCTYPE html><html><head><title>Error</title></head>
       <body style="font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#faf8f5;">
       <div style="text-align:center;padding:40px;">
         <h1 style="color:#2d1b4e;">Something went wrong</h1>
         <p style="color:#6b5b7b;">Please try again or contact us at hello@lovingcharmz.com.</p>
       </div></body></html>`,
      { status: 500, headers: { 'Content-Type': 'text/html' } },
    );
  }

  return successPage();
}

function successPage() {
  return new NextResponse(
    `<!DOCTYPE html><html><head><title>Unsubscribed</title></head>
     <body style="font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#faf8f5;">
     <div style="text-align:center;padding:40px;">
       <h1 style="color:#2d1b4e;">You&rsquo;ve been unsubscribed</h1>
       <p style="color:#6b5b7b;margin-bottom:24px;">You won&rsquo;t receive any more abandoned cart reminders.</p>
       <a href="https://lovingcharmz.com/shop" style="display:inline-block;background:#2d1b4e;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-size:14px;letter-spacing:1px;">
         VISIT THE SHOP
       </a>
     </div></body></html>`,
    { status: 200, headers: { 'Content-Type': 'text/html' } },
  );
}
