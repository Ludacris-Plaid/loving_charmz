import 'server-only';
import { headers } from 'next/headers';

/**
 * Absolute origin of the running site, used to build provider return/cancel and
 * webhook URLs. Derived from the request when `NEXT_PUBLIC_SITE_URL` is unset so
 * preview deployments and localhost work without extra configuration.
 */
export async function getSiteUrl(): Promise<string> {
  const configured = (process.env.NEXT_PUBLIC_SITE_URL ?? '').trim().replace(/\/+$/, '');
  if (configured) return configured;

  const headerList = await headers();
  const host = headerList.get('x-forwarded-host') ?? headerList.get('host') ?? 'localhost:3000';
  const forwardedProto = headerList.get('x-forwarded-proto');
  const isLocal = host.startsWith('localhost') || host.startsWith('127.0.0.1') || host.startsWith('0.0.0.0');
  const proto = forwardedProto ?? (isLocal ? 'http' : 'https');
  return `${proto}://${host}`;
}
