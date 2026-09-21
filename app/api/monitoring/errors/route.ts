import { NextRequest, NextResponse } from 'next/server';
import { logErrorEvent } from '@/lib/monitoring/instrumentation';

/**
 * Client-side error reporting endpoint.  The global-error boundary and any
 * client component that catches an exception POST here.  The body is tiny
 * (message + optional stack + path) and contains no PII.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    await logErrorEvent({
      source: 'client',
      message: body.message || 'Unknown client error',
      stack: body.stack ?? null,
      digest: body.digest ?? null,
      path: body.path ?? null,
      userAgent: request.headers.get('user-agent'),
    });
  } catch {
    // Swallow
  }
  return NextResponse.json({ ok: true });
}
