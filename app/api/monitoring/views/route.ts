import { NextRequest, NextResponse } from 'next/server';
import { trackPageView } from '@/lib/monitoring/analytics';

/**
 * Client-side page view beacon endpoint.  The layout-level client component
 * POSTs here on every navigation.  Returns 204 to keep the beacon payload
 * minimal and avoid CORS preflight overhead.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    await trackPageView({
      path: body.path || '/',
      referrer: request.headers.get('referer'),
      userAgent: request.headers.get('user-agent'),
      country: request.headers.get('x-vercel-ip-country'),
    });
  } catch {
    // Swallow
  }
  return new NextResponse(null, { status: 204 });
}
