import { PaymentProviderError } from './types';
import type { PaymentProviderId } from './types';

type RequestOptions = {
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: unknown;
  /** Form-encoded bodies are needed for the PayPal OAuth endpoint. */
  form?: Record<string, string>;
  timeoutMs?: number;
};

/**
 * Minimal JSON transport shared by the provider adapters.
 *
 * Every provider call in this repo goes through here so that failures are
 * reported as a PaymentProviderError carrying the provider's own error code,
 * instead of a raw "fetch failed" that tells an admin nothing.
 */
export async function requestJson<T>(
  provider: PaymentProviderId,
  url: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = 'POST', headers = {}, body, form, timeoutMs = 20_000 } = options;

  const init: RequestInit = {
    method,
    headers: { Accept: 'application/json', ...headers },
    cache: 'no-store',
    signal:
      typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
        ? AbortSignal.timeout(timeoutMs)
        : undefined,
  };

  if (form) {
    init.body = new URLSearchParams(form).toString();
    (init.headers as Record<string, string>)['Content-Type'] = 'application/x-www-form-urlencoded';
  } else if (body !== undefined) {
    init.body = JSON.stringify(body);
    (init.headers as Record<string, string>)['Content-Type'] = 'application/json';
  }

  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Network error';
    throw new PaymentProviderError(provider, 'network_error', message, error);
  }

  const text = await response.text();
  const payload = parseJson(text);

  if (!response.ok) {
    throw new PaymentProviderError(
      provider,
      extractErrorCode(payload) || `http_${response.status}`,
      extractErrorMessage(payload) || `Request failed with status ${response.status}`,
      payload,
    );
  }

  return payload as T;
}

function parseJson(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function extractErrorCode(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const record = payload as Record<string, unknown>;
  const errors = record.errors;
  if (Array.isArray(errors) && errors.length > 0) {
    const first = errors[0] as Record<string, unknown>;
    if (typeof first.code === 'string') return first.code;
  }
  if (typeof record.name === 'string') return record.name;
  if (typeof record.category === 'string' && typeof record.code === 'string') return String(record.code);
  return null;
}

function extractErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const record = payload as Record<string, unknown>;
  if (typeof record.message === 'string') return record.message;
  if (typeof record.detail === 'string') return record.detail;
  if (typeof record.error_description === 'string') return record.error_description;
  if (typeof record.error === 'string') return record.error;
  const errors = record.errors;
  if (Array.isArray(errors) && errors.length > 0) {
    const first = errors[0] as Record<string, unknown>;
    const detail = typeof first.detail === 'string' ? first.detail : null;
    const code = typeof first.code === 'string' ? first.code : null;
    return detail || code;
  }
  return null;
}

/**
 * Money / transaction ids from a provider are echoed into SQL lookups, so they
 * are only trusted when they are plain scalars of a sane length.
 */
export function safeReference(value: unknown, maxLength = 128): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength) return null;
  if (!/^[A-Za-z0-9._:-]+$/.test(trimmed)) return null;
  return trimmed;
}
