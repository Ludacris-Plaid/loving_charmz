import 'server-only';
import { Resend } from 'resend';

let _client: Resend | null = null;

export function getResendClient(): Resend {
  if (_client) return _client;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY is not set');
  _client = new Resend(apiKey);
  return _client;
}

export const FROM_EMAIL = 'Loving Charmz <orders@lovingcharmz.com>';
export const FROM_SUPPORT = 'Loving Charmz <hello@lovingcharmz.com>';
