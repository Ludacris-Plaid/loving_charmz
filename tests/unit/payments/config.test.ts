import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  getPaymentMethodOptions,
  getPayPalConfig,
  getSquareConfig,
  isEmbeddedCardConfigured,
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

describe('embedded card form availability', () => {
  // Regression: the server could charge a card with only a token and a
  // location, so checkout advertised card payment, the Web Payments SDK form
  // then failed to render for want of SQUARE_APP_ID, and the shopper was
  // silently redirected to a hosted Square page that re-asked the address and
  // rejected postal codes our own form had accepted.
  it('is not available when SQUARE_APP_ID is missing, even if the server can charge', () => {
    vi.stubEnv('SQUARE_ACCESS_TOKEN', 'real-token');
    vi.stubEnv('SQUARE_LOCATION_ID', 'real-location');
    vi.stubEnv('SQUARE_MODE', 'sandbox');
    vi.stubEnv('SQUARE_APP_ID', '');

    // The server-side capability is genuinely there…
    expect(getSquareConfig()).not.toBeNull();
    expect(isProviderConfigured('square')).toBe(true);
    // …but the browser form cannot be built, so card must not be offered.
    expect(isEmbeddedCardConfigured()).toBe(false);
    expect(getPaymentMethodOptions().find((m) => m.id === 'card')?.configured).toBe(false);
  });

  it('is available once SQUARE_APP_ID is present', () => {
    vi.stubEnv('SQUARE_ACCESS_TOKEN', 'real-token');
    vi.stubEnv('SQUARE_LOCATION_ID', 'real-location');
    vi.stubEnv('SQUARE_MODE', 'sandbox');
    vi.stubEnv('SQUARE_APP_ID', 'sandbox-sq0idb-abc');

    expect(isEmbeddedCardConfigured()).toBe(true);
    expect(getPaymentMethodOptions().find((m) => m.id === 'card')?.configured).toBe(true);
  });

  it('treats a placeholder app id as missing', () => {
    vi.stubEnv('SQUARE_ACCESS_TOKEN', 'real-token');
    vi.stubEnv('SQUARE_LOCATION_ID', 'real-location');
    vi.stubEnv('SQUARE_APP_ID', 'your_square_app_id');

    expect(isEmbeddedCardConfigured()).toBe(false);
  });

  it('does not let Square availability decide PayPal', () => {
    vi.stubEnv('PAYPAL_CLIENT_ID', 'real-client');
    vi.stubEnv('PAYPAL_CLIENT_SECRET', 'real-secret');
    vi.stubEnv('SQUARE_ACCESS_TOKEN', '');
    vi.stubEnv('SQUARE_LOCATION_ID', '');
    vi.stubEnv('SQUARE_APP_ID', '');

    const options = getPaymentMethodOptions();
    expect(options.find((m) => m.id === 'paypal')?.configured).toBe(true);
    expect(options.find((m) => m.id === 'card')?.configured).toBe(false);
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
