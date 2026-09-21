import { NextRequest, NextResponse } from 'next/server';
import { sendAbandonedCartEmails } from '@/lib/email/abandoned-cart';

/**
 * Vercel Cron endpoint — runs every hour to send abandoned cart emails.
 *
 * Secured by CRON_SECRET: only Vercel's cron infrastructure (or someone
 * with the secret) can hit this route.
 *
 * See vercel.json for the schedule.
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
