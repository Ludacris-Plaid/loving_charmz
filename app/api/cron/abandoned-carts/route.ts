import { NextRequest, NextResponse } from 'next/server';
import { sendAbandonedCartEmails } from '@/lib/email/abandoned-cart';

export const runtime = 'nodejs';

/**
 * Vercel Cron endpoint — runs once daily to send abandoned cart emails.
 *
 * Secured by CRON_SECRET: only Vercel's cron infrastructure (or someone
 * with the secret) can hit this route. It is also safe to trigger manually:
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://lovingcharmz.com/api/cron/abandoned-carts
 *
 * Detection is idempotent per cart (one email per cart per 24h, recorded in
 * abandoned_cart_emails), so running more often than the schedule — e.g. an
 * external pinger or an upgrade to hourly cron on Vercel Pro — cannot spam
 * shoppers. See vercel.json for the schedule (Hobby plan allows daily only).
 *
 * The daily run catches carts abandoned 1–24h ago: the detection window is
 * intentionally wide (last update >1h ago, cart younger than 24h) so a
 * once-a-day sweep still reaches yesterday's abandoned carts exactly once.
 */
export async function GET(request: NextRequest) {
  // Authenticate: Vercel Cron sends the secret as a bearer token
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json(
      { error: 'CRON_SECRET not configured' },
      { status: 500 },
    );
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await sendAbandonedCartEmails();

    return NextResponse.json({
      ok: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[abandoned-carts cron]', error);
    return NextResponse.json(
      { error: error.message || 'Internal error' },
      { status: 500 },
    );
  }
}

// Also allow POST for manual triggers from admin
export const POST = GET;
