import { NextRequest, NextResponse } from 'next/server';
import { getCpConfig, getTrackingSummary } from '@/lib/shipping/canadapost';

export const dynamic = 'force-dynamic';

/**
 * Customer-safe tracking lookup.
 *
 * Rate limiting and size guards keep this endpoint from being hammered;
 * Canada Post credentials never leave the server. Returns `available:
 * false` (not an error) when the shop has no tracking key, so the UI
 * falls back to the public canadapost.ca link. Tracking by PIN needs
 * only the tracking key — no customer number — so it works before the
 * shipping/rating setup is complete.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ pin: string }> },
) {
  const { pin } = await params;

  // PINs are 12–16 alphanumeric characters per CP docs — reject anything else.
  const cleaned = pin.trim();
  if (!/^[A-Za-z0-9]{10,20}$/.test(cleaned)) {
    return NextResponse.json({ error: 'Invalid tracking number format.' }, { status: 400 });
  }

  const cfg = getCpConfig();
  if (!cfg?.trackingAuth) {
    return NextResponse.json({ available: false });
  }

  try {
    const summary = await getTrackingSummary(cleaned);
    return NextResponse.json({
      available: true,
      status: summary.eventName,
      expectedDelivery: summary.expectedDelivery,
      deliveredTo: summary.deliveredTo,
      lastEvent: summary.events?.[0]
        ? {
            date: summary.events[0].date,
            description: summary.events[0].description,
            site: summary.events[0].site,
          }
        : null,
    });
  } catch {
    return NextResponse.json({ error: 'Tracking lookup failed.' }, { status: 502 });
  }
}
