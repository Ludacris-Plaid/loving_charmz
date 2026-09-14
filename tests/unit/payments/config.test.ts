import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  getPaymentMethodOptions,
  getPayPalConfig,
  getSquareConfig,
  isProviderConfigured,
  resolvePaymentMethod,
} from '@/lib/payments/config';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('placeholder credentials', () => {
  it('treats the checked-in example values as unconfigured', () => {
    vi.stubEnv('PAYPAL_CLIENT_ID', 'your_sandbox_client_id');
    vi.stubEnv('PAYPAL_CLIENT_SECRET', 'your_sandbox_secret');
    vi.stubEnv('SQUARE_ACCESS_TOKEN', 'your_sandbox_access_token');
    vi.stubEnv('SQUARE_LOCATION_ID', 'your_sandbox_location_id');

    expect(getPayPalConfig()).toBeNull();
    expect(getSquareConfig()).toBeNull();
    expect(isProviderConfigured('paypal')).toBe(false);
    expect(isProviderConfigured('square')).toBe(false);
    expect(getPaymentMethodOptions().every((method) => !method.configured)).toBe(true);
  });

  it('treats blank values as unconfigured', () => {
    vi.stubEnv('PAYPAL_CLIENT_ID', '');
    vi.stubEnv('PAYPAL_CLIENT_SECRET', '   ');
    expect(getPayPalConfig()).toBeNull();
  });
});

describe('configured providers', () => {
  it('defaults PayPal to the sandbox host and follows PAYPAL_MODE', () => {
    vi.stubEnv('PAYPAL_CLIENT_ID', 'real-client');
    vi.stubEnv('PAYPAL_CLIENT_SECRET', 'real-secret');
    vi.stubEnv('PAYPAL_MODE', 'sandbox');
    expect(getPayPalConfig()?.baseUrl).toBe('https://api-m.sandbox.paypal.com');

    vi.stubEnv('PAYPAL_MODE', 'live');
    expect(getPayPalConfig()?.baseUrl).toBe('https://api-m.paypal.com');
  });

  it('defaults Square to the sandbox host and follows SQUARE_MODE', () => {
    vi.stubEnv('SQUARE_ACCESS_TOKEN', 'real-token');
    vi.stubEnv('SQUARE_LOCATION_ID', 'real-location');
    vi.stubEnv('SQUARE_MODE', 'sandbox');
    expect(getSquareConfig()?.baseUrl).toBe('https://connect.squareupsandbox.com');

    vi.stubEnv('SQUARE_MODE', 'live');
    expect(getSquareConfig()?.baseUrl).toBe('https://connect.squareup.com');
  });
});

describe('resolvePaymentMethod', () => {
  it('maps the card option to Square and accepts provider names', () => {
    expect(resolvePaymentMethod('card')?.provider).toBe('square');
    expect(resolvePaymentMethod('paypal')?.provider).toBe('paypal');
    expect(resolvePaymentMethod('square')?.provider).toBe('square');
    expect(resolvePaymentMethod('bitcoin')).toBeNull();
  });
});
