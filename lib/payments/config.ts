import 'server-only';

import type { PaymentMethodId, PaymentMode, PaymentProviderId } from './types';

/**
 * Reads payment configuration from the environment.
 *
 * The checked-in `.env.local.example` ships placeholder values such as
 * `your_sandbox_client_id`. Those must never be treated as real credentials —
 * otherwise checkout would happily create orders that can never be paid — so
 * anything that looks like a placeholder is reported as "not configured".
 */

const PLACEHOLDER_PREFIX = 'your_';

function clean(value: string | undefined): string {
  return (value ?? '').trim().replace(/^["']|["']$/g, '');
}

export function isPlaceholderValue(value: string | undefined | null): boolean {
  const cleaned = clean(value ?? undefined);
  return cleaned.length === 0 || cleaned.startsWith(PLACEHOLDER_PREFIX);
}

export function readPaymentEnv(name: string): string {
  const value = clean(process.env[name]);
  return isPlaceholderValue(value) ? '' : value;
}

function readMode(name: string): PaymentMode {
  return clean(process.env[name]).toLowerCase() === 'live' ? 'live' : 'sandbox';
}

export type PayPalConfig = {
  mode: PaymentMode;
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  /** Enables signature verification on the webhook route when present. */
  webhookId: string | null;
};

export type SquareConfig = {
  mode: PaymentMode;
  baseUrl: string;
  accessToken: string;
  locationId: string;
  /** Enables HMAC verification on the webhook route when present. */
  webhookSignatureKey: string | null;
  apiVersion: string;
};

export const SQUARE_API_VERSION = '2025-01-23';

export function getPayPalConfig(): PayPalConfig | null {
  const clientId = readPaymentEnv('PAYPAL_CLIENT_ID');
  const clientSecret = readPaymentEnv('PAYPAL_CLIENT_SECRET');
  if (!clientId || !clientSecret) return null;

  const mode = readMode('PAYPAL_MODE');
  return {
    mode,
    baseUrl: mode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com',
    clientId,
    clientSecret,
    webhookId: readPaymentEnv('PAYPAL_WEBHOOK_ID') || null,
  };
}

export function getSquareConfig(): SquareConfig | null {
  const accessToken = readPaymentEnv('SQUARE_ACCESS_TOKEN');
  const locationId = readPaymentEnv('SQUARE_LOCATION_ID');
  if (!accessToken || !locationId) return null;

  const mode = readMode('SQUARE_MODE');
  return {
    mode,
    baseUrl: mode === 'live' ? 'https://connect.squareup.com' : 'https://connect.squareupsandbox.com',
    accessToken,
    locationId,
    webhookSignatureKey: readPaymentEnv('SQUARE_WEBHOOK_SIGNATURE_KEY') || null,
    apiVersion: SQUARE_API_VERSION,
  };
}

export type PaymentMethodOption = {
  id: PaymentMethodId;
  provider: PaymentProviderId;
  label: string;
  description: string;
  configured: boolean;
};

const METHOD_DEFINITIONS: Omit<PaymentMethodOption, 'configured'>[] = [
  {
    id: 'paypal',
    provider: 'paypal',
    label: 'PayPal',
    description: 'Pay with your PayPal balance, bank, or card. You will be redirected to PayPal.',
  },
  {
    id: 'card',
    provider: 'square',
    label: 'Credit / Debit Card',
    description: 'Secure card checkout hosted by Square. No card details are stored on this site.',
  },
];

export function isProviderConfigured(provider: PaymentProviderId): boolean {
  return provider === 'paypal' ? getPayPalConfig() !== null : getSquareConfig() !== null;
}

export function getPaymentMethodOptions(): PaymentMethodOption[] {
  return METHOD_DEFINITIONS.map((method) => ({
    ...method,
    configured: isProviderConfigured(method.provider),
  }));
}

export function resolvePaymentMethod(method: string): PaymentMethodOption | null {
  const normalised = method.trim().toLowerCase();
  return (
    getPaymentMethodOptions().find((option) => option.id === normalised || option.provider === normalised) ?? null
  );
}

export function paymentMethodLabel(provider: PaymentProviderId): string {
  return METHOD_DEFINITIONS.find((method) => method.provider === provider)?.label ?? provider;
}
