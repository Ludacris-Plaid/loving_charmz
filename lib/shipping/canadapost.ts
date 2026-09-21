import 'server-only';

/**
 * Canada Post REST client — labels, manifests, and tracking.
 *
 * Built on the Canada Post Developer Portal APIs (April 2026 generation):
 * REST + JSON, authenticated with OAuth 2.0 client-credentials Bearer
 * tokens minted from a per-app key/secret pair. All traffic goes through
 * the single portal gateway:
 *
 *   token:     …/devportal-portaildesdeveloppeurs/cpc-api-native-oauth-provider/oauth2/token
 *   shipping:  …/devportal-portaildesdeveloppeurs/shipping/v1   (labels, manifests)
 *   rating:    …/devportal-portaildesdeveloppeurs/rating/v1     (live checkout rates)
 *   tracking:  …/devportal-portaildesdeveloppeurs/tracking/v1   (PIN status)
 *
 * Each API product is subscribed independently in the portal, so every
 * family carries its own key:secret pair:
 *   CP_RATING_KEY="key:secret"      Get Rates at checkout
 *   CP_SHIPPING_KEY="key:secret"    label creation + manifests
 *   CP_TRACKING_KEY="key:secret"    live tracking lookups
 *   CP_API_KEY (fallback)           one pair used for every family
 * A family missing its pair falls back to any configured pair of the same
 * Canada Post account — the gateway authorizes by app subscription, so a
 * fallback only ever succeeds when that app really has access.
 *
 * Other env values:
 *   CP_CUSTOMER_NUMBER     10-digit mailed-by customer number
 *   CP_MODE                "non-contract" (default) | "contract"
 *   CP_ORIGIN_POSTAL       6-char origin postal code (e.g. T2T1N6)
 *   CP_SENDER_ADDRESS / CP_SENDER_CITY / CP_SENDER_PROVINCE / CP_SENDER_PHONE
 *   CP_QUOTE_TYPE          "counter" (default) | "commercial" — rating basis
 *
 * Without at least one key pair the module reports `isConfigured: false`
 * and every admin action returns a friendly message instead of calling.
 */

const GATEWAY = 'https://api.canadapost-postescanada.ca/prod/devportal-portaildesdeveloppeurs';
const TOKEN_URL = `${GATEWAY}/cpc-api-native-oauth-provider/oauth2/token`;

export type CpFamily = 'rating' | 'shipping' | 'tracking';

export type CpConfig = {
  /** key:secret pairs per family (post-fallback; null when absent). */
  ratingPair: string | null;
  shippingPair: string | null;
  trackingPair: string | null;
  customerNumber: string;
  mode: 'non-contract' | 'contract';
  originPostal: string;
  shippingPointId?: string;
  quoteType: 'counter' | 'commercial';
};

function normalizePair(value: string | undefined): string | null {
  const pair = value?.trim();
  if (!pair || !pair.includes(':')) return null;
  const [key, ...rest] = pair.split(':');
  const secret = rest.join(':').trim();
  return key && secret ? `${key.trim()}:${secret}` : null;
}

function resolvePairs() {
  const legacy = normalizePair(process.env.CP_API_KEY);
  const rating = normalizePair(process.env.CP_RATING_KEY) ?? legacy;
  const shipping = normalizePair(process.env.CP_SHIPPING_KEY) ?? legacy;
  const tracking = normalizePair(process.env.CP_TRACKING_KEY) ?? legacy;
  return {
    ratingPair: rating ?? shipping ?? tracking,
    shippingPair: shipping ?? rating ?? tracking,
    trackingPair: tracking ?? shipping ?? rating,
  };
}

export function getCpConfig(): CpConfig | null {
  const { ratingPair, shippingPair, trackingPair } = resolvePairs();
  if (!ratingPair && !shippingPair && !trackingPair) return null;

  const customerNumber = process.env.CP_CUSTOMER_NUMBER?.trim();
  if (!customerNumber) return null;

  const mode = (process.env.CP_MODE || 'non-contract').toLowerCase() === 'contract'
    ? 'contract'
    : 'non-contract';
  const quoteType = (process.env.CP_QUOTE_TYPE || 'counter').toLowerCase() === 'commercial'
    ? 'commercial'
    : 'counter';

  return {
    ratingPair,
    shippingPair,
    trackingPair,
    customerNumber,
    mode,
    originPostal: (process.env.CP_ORIGIN_POSTAL || '').replace(/\s/g, '').toUpperCase(),
    shippingPointId: process.env.CP_SHIPPING_POINT_ID?.trim() || undefined,
    quoteType,
  };
}

export function isCanadaPostConfigured(): boolean {
  return getCpConfig() !== null;
}

function pairFor(cfg: CpConfig, family: CpFamily): string | null {
  if (family === 'rating') return cfg.ratingPair;
  if (family === 'shipping') return cfg.shippingPair;
  return cfg.trackingPair;
}

/* ── OAuth 2.0 client-credentials token cache ────────────────────────── */

type CachedToken = { token: string; expiresAt: number };
const tokenCache = new Map<string, CachedToken>();

async function getBearerToken(cfg: CpConfig, family: CpFamily): Promise<string> {
  const pair = pairFor(cfg, family);
  if (!pair) throw new CanadaPostError(`Canada Post ${family} credentials are not configured.`);

  const cached = tokenCache.get(family);
  if (cached && cached.expiresAt > Date.now() + 5 * 60 * 1000) return cached.token;

  const [clientId, ...rest] = pair.split(':');
  const clientSecret = rest.join(':');

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'X-IBM-Client-Id': clientId,
      'X-IBM-Client-Secret': clientSecret,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: 'grant_type=client_credentials&scope=merchant',
    cache: 'no-store',
  });
  const body = (await res.json().catch(() => null)) as { access_token?: string; expires_in?: number; error_description?: string } | null;
  if (!res.ok || !body?.access_token) {
    throw new CanadaPostError(
      `Canada Post authentication failed for ${family}: ${body?.error_description || `HTTP ${res.status}`}`,
    );
  }
  const expiresIn = typeof body.expires_in === 'number' ? body.expires_in : 3600;
  tokenCache.set(family, { token: body.access_token, expiresAt: Date.now() + expiresIn * 1000 });
  return body.access_token;
}

/* ── Error surface ───────────────────────────────────────────────────── */

export class CanadaPostError extends Error {
  code: string | null;
  constructor(message: string, code: string | null = null) {
    super(message);
    this.name = 'CanadaPostError';
    this.code = code;
  }
}

type ApiErrorBody = {
  title?: string;
  detail?: string;
  errors?: { errorCode?: string; message?: string }[];
  httpCode?: string;
  httpMessage?: string;
  moreInformation?: string;
};

function describeError(status: number, body: string): CanadaPostError {
  let parsed: ApiErrorBody | null = null;
  try {
    parsed = JSON.parse(body) as ApiErrorBody;
  } catch {
    // non-JSON body — fall through
  }
  if (parsed?.errors?.length) {
    const first = parsed.errors[0];
    return new CanadaPostError(
      `Canada Post ${first.errorCode ?? ''}: ${first.message ?? parsed.detail ?? parsed.title ?? 'request failed'}`.replace(': :', ': '),
      first.errorCode ?? null,
    );
  }
  if (parsed?.httpCode) {
    return new CanadaPostError(
      `Canada Post HTTP ${parsed.httpCode}: ${parsed.moreInformation || parsed.httpMessage}`,
      null,
    );
  }
  if (parsed?.detail || parsed?.title) {
    return new CanadaPostError(`Canada Post: ${parsed.detail || parsed.title}`, null);
  }
  return new CanadaPostError(`Canada Post HTTP ${status}: ${body.slice(0, 200) || 'request failed'}`);
}

export async function cpJson<T>(
  cfg: CpConfig,
  family: CpFamily,
  url: string,
  init: { method: 'GET' | 'POST' | 'DELETE'; body?: unknown; accept?: string; timeoutMs?: number } = { method: 'GET' },
): Promise<{ status: number; data: T | null }> {
  const token = await getBearerToken(cfg, family);
  const res = await fetch(url, {
    method: init.method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: init.accept ?? 'application/json',
      'Accept-Language': 'en-CA',
      ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    cache: 'no-store',
    signal: AbortSignal.timeout(init.timeoutMs ?? 15000),
  });
  const text = await res.text();
  if (res.status >= 400) {
    // Manifest/artifact endpoints sometimes 404 briefly while rendering.
    throw describeError(res.status, text);
  }
  let data: T | null = null;
  if (text) {
    try {
      data = JSON.parse(text) as T;
    } catch {
      data = null; // PDF/binary endpoints return non-JSON
    }
  }
  return { status: res.status, data };
}

/* ── Address / parcel input ──────────────────────────────────────────── */

export type CpAddress = {
  name?: string;
  company?: string;
  phone?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  province: string; // 2-char CA province or US state code
  postalCode: string;
  countryCode: 'CA' | 'US' | string;
};

export type CpParcel = {
  weightKg: number; // e.g. 0.35
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
};

export type CpShipmentInput = {
  serviceCode: string; // DOM.EP etc.
  sender: CpAddress;
  destination: CpAddress;
  parcel: CpParcel;
  email?: string; // shopper email for CP tracking notifications
  reference?: string; // stored as customerRef1 (shows in Track)
  orderTotalCad?: number; // customs value for US/international
};

export function normalizePostal(postal: string, country: string): string {
  const raw = postal.replace(/\s/g, '').toUpperCase();
  return country === 'CA' ? raw : raw; // US format kept as-is (5 or 5-4)
}

const DOMESTIC_SERVICES = /^DOM\./;
export function isDomesticService(serviceCode: string): boolean {
  return DOMESTIC_SERVICES.test(serviceCode);
}

type CpApiLink = { rel?: string; href?: string; index?: number; mediaType?: string };

/** Flatten the links array into rel → href. */
export function parseLinks(links: CpApiLink[] | undefined | null): Record<string, string> {
  const out: Record<string, string> = {};
  for (const l of links ?? []) {
    if (l?.rel && l?.href) out[l.rel] = l.href;
  }
  return out;
}

/* ── Shipment request builders (exported for tests) ──────────────────── */

type DeliverySpec = {
  serviceCode: string;
  sender: Record<string, unknown>;
  destination: Record<string, unknown>;
  parcelCharacteristics: Record<string, unknown>;
  preferences: Record<string, unknown>;
  settlementInfo: Record<string, unknown>;
  options?: unknown;
  notification?: Record<string, unknown>;
  printPreferences?: Record<string, unknown>;
  references?: Record<string, unknown>;
  customs?: Record<string, unknown>;
};

function addressDetails(addr: CpAddress, opts: { domestic: boolean }): Record<string, unknown> {
  const details: Record<string, unknown> = {
    addressLine1: addr.addressLine1,
    city: addr.city,
    provState: addr.province.toUpperCase().slice(0, 2),
    countryCode: opts.domestic ? 'CA' : addr.countryCode,
    postalZipCode: normalizePostal(addr.postalCode, opts.domestic ? 'CA' : addr.countryCode),
  };
  if (addr.addressLine2) details.addressLine2 = addr.addressLine2;
  return details;
}

export function buildShipmentRequest(
  input: CpShipmentInput,
  opts: { mode: 'non-contract' | 'contract'; groupId?: string },
): Record<string, unknown> {
  const domestic = isDomesticService(input.serviceCode);
  const intl = !domestic;

  const dims = input.parcel.lengthCm && input.parcel.widthCm && input.parcel.heightCm
    ? {
        length: Math.min(999.9, input.parcel.lengthCm),
        width: Math.min(999.9, input.parcel.widthCm),
        height: Math.min(999.9, input.parcel.heightCm),
      }
    : undefined;

  const parcel: Record<string, unknown> = { weight: Math.max(0.001, input.parcel.weightKg) };
  if (dims) parcel.dimensions = dims;

  const spec: DeliverySpec = {
    serviceCode: input.serviceCode,
    sender: {
      ...(input.sender.name ? { name: input.sender.name } : {}),
      company: input.sender.company || 'Loving Charmz',
      contactPhone: input.sender.phone || '5555555555',
      addressDetails: addressDetails(input.sender, { domestic: true }),
    },
    destination: {
      ...(input.destination.name ? { name: input.destination.name } : {}),
      ...(input.destination.company ? { company: input.destination.company } : {}),
      ...((!domestic && input.destination.phone) ? { clientVoiceNumber: input.destination.phone } : {}),
      addressDetails: addressDetails(input.destination, { domestic }),
    },
    parcelCharacteristics: parcel,
    preferences: { showPackingInstructions: true },
    settlementInfo:
      opts.mode === 'contract'
        ? { intendedMethodOfPayment: 'Account' }
        : { intendedMethodOfPayment: 'CreditCard' },
  };

  if (input.email) {
    spec.notification = {
      email: input.email,
      onShipment: true,
      onException: true,
      onDelivery: true,
    };
  }

  spec.printPreferences = { outputFormat: '8.5x11', encoding: 'PDF' };

  if (input.reference) {
    spec.references = { customerRef1: input.reference.slice(0, 35) };
  }

  if (intl) {
    spec.customs = {
      currency: 'CAD',
      reasonForExport: 'SOG', // sale of goods
      ...(input.orderTotalCad ? { conversionFromCad: 1 } : {}),
    };
  }

  const body: Record<string, unknown> = {
    requestedShippingPoint: normalizePostal(process.env.CP_ORIGIN_POSTAL || '', 'CA') || undefined,
    expectedMailingDate: new Date().toISOString().slice(0, 10),
    deliverySpec: spec,
  };

  if (opts.mode === 'contract') {
    body.groupId = opts.groupId;
  } else {
    // Non-contract labels are billed to the card on file immediately and
    // need no manifest — transmitShipment must NOT be combined with groupId.
    body.transmitShipment = true;
  }

  // Drop undefined values (fetch JSON.stringify keeps them as null otherwise).
  return JSON.parse(JSON.stringify(body));
}

/* ── Create shipment ─────────────────────────────────────────────────── */

export type CpShipmentResult = {
  /** CP shipment id (needed for void/refund/price calls). */
  shipmentId: string | null;
  pin: string | null;
  links: Record<string, string>; // self, label, details, price, receipt…
  price: { due: number | null; gst: number | null; pst: number | null } | null;
};

type CreateShipmentResponse = {
  shipmentId?: string;
  trackingPin?: string;
  links?: CpApiLink[];
  shipmentPrice?: {
    dueAmount?: number;
    gstAmount?: number;
    pstAmount?: number;
    hstAmount?: number;
  } | null;
};

export async function createShipment(
  input: CpShipmentInput,
  cfgOverride?: CpConfig,
): Promise<CpShipmentResult> {
  const cfg = cfgOverride ?? getCpConfig();
  if (!cfg) throw new CanadaPostError('Canada Post is not configured.');
  if (!pairFor(cfg, 'shipping')) throw new CanadaPostError('Canada Post shipping credentials are not configured.');

  const groupId = cfg.mode === 'contract'
    ? `lc-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`
    : undefined;

  const body = buildShipmentRequest(input, { mode: cfg.mode, groupId });
  const url = `${GATEWAY}/shipping/v1/${cfg.customerNumber}/${cfg.customerNumber}/shipments`;
  const { data } = await cpJson<CreateShipmentResponse>(cfg, 'shipping', url, {
    method: 'POST',
    body,
  });
  if (!data) throw new CanadaPostError('Canada Post returned an unreadable shipment response.');

  const price = data.shipmentPrice
    ? {
        due: data.shipmentPrice.dueAmount ?? null,
        gst: data.shipmentPrice.gstAmount ?? null,
        pst: data.shipmentPrice.pstAmount ?? null,
      }
    : null;

  return {
    shipmentId: data.shipmentId ?? null,
    pin: data.trackingPin ?? null,
    links: parseLinks(data.links),
    price,
  };
}

/* ── Void / manifest / label ─────────────────────────────────────────── */

export async function voidShipment(
  links: Record<string, string>,
  cfgOverride?: CpConfig,
): Promise<void> {
  const cfg = cfgOverride ?? getCpConfig();
  if (!cfg) throw new CanadaPostError('Canada Post is not configured.');
  const href = links.self;
  if (!href) throw new CanadaPostError('No void link stored for this shipment.');
  await cpJson(cfg, 'shipping', href, { method: 'DELETE' });
}

export async function transmitShipments(
  groupIds: string[],
  cfgOverride?: CpConfig,
): Promise<{ manifestLinks: string[] }> {
  const cfg = cfgOverride ?? getCpConfig();
  if (!cfg) throw new CanadaPostError('Canada Post is not configured.');

  const body: Record<string, unknown> = {
    groupIds,
    methodOfPayment: 'Account',
    manifestAddress: {
      manifestCompany: 'Loving Charmz',
      manifestPhone: process.env.CP_SENDER_PHONE || '5555555555',
      manifestAddressDetails: {
        city: process.env.CP_SENDER_CITY || undefined,
        provState: process.env.CP_SENDER_PROVINCE || undefined,
        countryCode: 'CA',
        postalZipCode: cfg.originPostal || undefined,
      },
    },
  };
  if (cfg.shippingPointId) body.shippingPointId = cfg.shippingPointId;
  else if (cfg.originPostal) body.requestedShippingPoint = cfg.originPostal;

  const url = `${GATEWAY}/shipping/v1/${cfg.customerNumber}/${cfg.customerNumber}/manifests`;
  const { data } = await cpJson<CpApiLink[] | Record<string, unknown>>(cfg, 'shipping', url, {
    method: 'POST',
    body,
  });

  // manifestList: array of link objects (rel "manifest", mediaType pdf).
  const list = Array.isArray(data) ? data : [];
  const manifestLinks = list
    .filter((l): l is CpApiLink & { href: string } => Boolean(l?.rel && l?.href))
    .map((l) => l.href);
  return { manifestLinks };
}

export async function getLabelPdf(
  links: Record<string, string>,
  cfgOverride?: CpConfig,
): Promise<Buffer> {
  const cfg = cfgOverride ?? getCpConfig();
  if (!cfg) throw new CanadaPostError('Canada Post is not configured.');
  const href = links.label ?? links.self;
  if (!href) throw new CanadaPostError('Stored shipment has no label link.');

  const token = await getBearerToken(cfg, 'shipping');
  const res = await fetch(href, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/pdf' },
    cache: 'no-store',
    signal: AbortSignal.timeout(20000),
  });
  const buf = Buffer.from(await res.arrayBuffer());
  if (!res.ok || buf.subarray(0, 4).toString() !== '%PDF') {
    // The label link may answer with a JSON pointer to the artifact first.
    let artifactHref: string | null = null;
    try {
      const parsed = JSON.parse(buf.toString('utf8')) as { links?: CpApiLink[] } | CpApiLink[];
      const arr = Array.isArray(parsed) ? parsed : (parsed.links ?? []);
      artifactHref = arr.find((l) => l?.rel === 'artifact')?.href ?? null;
    } catch {
      artifactHref = null;
    }
    if (!artifactHref) {
      throw new CanadaPostError(
        res.ok
          ? 'Label artifact did not return a PDF (it may still be rendering — retry in a few seconds).'
          : `Label download failed: HTTP ${res.status}`,
      );
    }
    const retry = await fetch(artifactHref, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/pdf' },
      cache: 'no-store',
      signal: AbortSignal.timeout(20000),
    });
    const pdf = Buffer.from(await retry.arrayBuffer());
    if (!retry.ok || pdf.subarray(0, 4).toString() !== '%PDF') {
      throw new CanadaPostError('Label artifact did not return a PDF (retry in a few seconds).');
    }
    return pdf;
  }
  return buf;
}

/* ── Tracking ────────────────────────────────────────────────────────── */

export type CpTrackingEvent = {
  date: string | null;
  time: string | null;
  description: string | null;
  site: string | null;
};

export type CpTrackingSummary = {
  pin: string | null;
  eventName: string | null; // e.g. "Delivered", "In transit"
  eventDate: string | null;
  eventSite: string | null;
  expectedDelivery: string | null;
  actualDelivery: string | null;
  deliveredTo: string | null;
  serviceName: string | null;
  events: CpTrackingEvent[];
};

type TrackingSummaryItem = {
  pin?: string;
  serviceName?: string;
  expectedDeliveryDate?: string;
  actualDeliveryDate?: string;
  eventDescription?: string;
  eventDateTime?: string;
  eventDate?: string;
  eventTime?: string;
  eventLocation?: string;
  eventSite?: string;
  error?: { code?: string; descEn?: string };
};

export function parseTrackingSummary(payload: TrackingSummaryItem[] | null): CpTrackingSummary {
  const items = Array.isArray(payload) ? payload : [];
  const first = items[0] ?? {};

  const events: CpTrackingEvent[] = items.map((it) => ({
    date: it.eventDate ?? it.eventDateTime?.slice(0, 10) ?? null,
    time: it.eventTime ?? it.eventDateTime?.slice(11) ?? null,
    description: it.eventDescription ?? null,
    site: it.eventLocation ?? it.eventSite ?? null,
  }));

  return {
    pin: first.pin ?? null,
    eventName: first.eventDescription ?? null,
    eventDate: first.eventDate ?? first.eventDateTime?.slice(0, 10) ?? null,
    eventSite: first.eventLocation ?? first.eventSite ?? null,
    expectedDelivery: first.expectedDeliveryDate ?? null,
    actualDelivery: first.actualDeliveryDate ?? null,
    deliveredTo: null,
    serviceName: first.serviceName ?? null,
    events,
  };
}

export async function getTrackingSummary(
  pin: string,
  cfgOverride?: CpConfig,
): Promise<CpTrackingSummary> {
  const cfg = cfgOverride ?? getCpConfig();
  if (!cfg) throw new CanadaPostError('Canada Post is not configured.');

  const url = `${GATEWAY}/tracking/v1/pins/${encodeURIComponent(pin.trim())}/summaries`;
  const { data } = await cpJson<TrackingSummaryItem[]>(cfg, 'tracking', url, { method: 'GET' });
  const summary = parseTrackingSummary(data);
  if (!summary.pin && data?.[0]?.error?.code) {
    const err = data[0].error;
    throw new CanadaPostError(err.descEn || 'Tracking lookup returned no data.', err.code ?? null);
  }
  return summary;
}
