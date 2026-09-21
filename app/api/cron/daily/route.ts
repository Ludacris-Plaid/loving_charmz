import { NextRequest, NextResponse } from 'next/server';
import { sendAbandonedCartEmails } from '@/lib/email/abandoned-cart';
import { flushStockAlerts } from '@/lib/email/stock-alerts';

/**
 * Daily maintenance cron — all scheduled email jobs in one endpoint.
 *
 * Currently runs:
 *  1. Abandoned cart reminders (member carts idle 1–24h, max 1 email/cart/24h)
 *  2. Sold-out stock alerts (drains the stock_alerts queue into a digest
 *     email to the owner; normally flushed in real time after settlement,
 *     this is the safety net for anything missed)
 *
 * Secured by CRON_SECRET — only Vercel's cron infrastructure (or someone
 * holding the secret) may run it. Every job is idempotent, so extra triggers
 * are harmless:
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://lovingcharmz.com/api/cron/daily
 *
 * Schedule lives in vercel.json (daily — Vercel Hobby plan allows no more).
 */
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const errors: string[] = [];

  // Run sequentially, not in parallel — both use the same Supabase admin
  // client and Resend; there is no throughput benefit at this scale and
  // failures are easier to attribute.
  let abandonedCarts: Awaited<ReturnType<typeof sendAbandonedCartEmails>> | null = null;
  let stockAlerts: { flushed: number } | null = null;

  try {
    abandonedCarts = await sendAbandonedCartEmails();
  } catch (error: any) {
    errors.push(`abandoned-carts: ${error?.message || 'failed'}`);
  }

  try {
    stockAlerts = await flushStockAlerts();
  } catch (error: any) {
    errors.push(`stock-alerts: ${error?.message || 'failed'}`);
  }

  return NextResponse.json({
    ok: errors.length === 0,
    abandonedCarts,
    stockAlerts,
    errors,
    timestamp: new Date().toISOString(),
  });
}

// Also allow POST for manual triggers.
export const POST = GET;
