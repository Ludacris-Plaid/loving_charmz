import 'server-only';

/**
 * Canada Post REST client — labels, manifests, and tracking.
 *
 * Covers the three API families the shop needs:
 *  - Non-Contract Shipping (nc-shipment v4): pay-per-label, no commercial
 *    contract needed. This is the default mode.
 *  - Contract Shipping (shipment v8 + manifest v8): for customers with a
 *    Canada Post contract — shipments join a group that is later transmitted
 *    into a manifest.
 *  - Tracking (track v2): live status for any PIN.
 *
 * All calls are XML-over-REST with HTTP Basic auth, per the Canada Post
 * developer docs (canadapost-postescanada.ca → Developer Program).
 *
 * Credentials (env) — Canada Post issues one key:secret pair per service.
 * The values go in as a single CP_API_KEY="key:secret" per family so the
 * config stays a flat map (see resolveAuths):
 *  - CP_RATING_KEY="key:secret"      Get Rates at checkout
 *  - CP_SHIPPING_KEY="key:secret"    label creation + manifests
 *  - CP_TRACKING_KEY="key:secret"    live tracking lookups
 *  - CP_API_KEY (legacy fallback)    one key for all families
 *  - CP_CUSTOMER_NUMBER 10-digit mailed-by customer number
 *  - CP_MODE           "non-contract" (default) | "contract"
 *  - CP_ENV            "sandbox" (default) | "production"
 *  - CP_ORIGIN_POSTAL  6-char origin postal code (e.g. T2T1N6)
 *  - CP_SHIPPING_POINT_ID  optional 4-char deposit site number (contract)
 *
 * Without at least a tracking key (or CP_API_KEY) the module reports
 * `isConfigured: false` and every admin action returns a friendly message
 * instead of attempting calls.
 */

export type CpConfig = {
  /** Pre-encoded Basic header values per API family. */
  ratingAuth: string | null;
  shippingAuth: string | null;
  trackingAuth: string | null;
  customerNumber: string;
  mode: 'non-contract' | 'contract';
  baseUrl: string; // ct.soa-gw (sandbox) or soa-gw (production)
  originPostal: string;
  shippingPointId?: string;
};

function basicAuth(user: string, secret: string): string {
  return `Basic ${Buffer.from(`${user}:${secret}`).toString('base64')}`;
}

/**
 * Resolves per-service auth headers. Accepts either the per-service
 * key/secret pairs (what the Developer Program mailbox actually shows) or
 * the legacy single CP_API_KEY="user:password" for all families.
 */
function resolveAuths() {
  const toAuth = (v: string | undefined): string | null => {
    const pair = v?.trim();
    return pair && pair.includes(':')
      ? basicAuth(pair.split(':')[0], pair.split(':').slice(1).join(':'))
      : null;
  };

  const ratingAuth = toAuth(process.env.CP_RATING_KEY);
  const shippingAuth = toAuth(process.env.CP_SHIPPING_KEY);
  const trackingAuth = toAuth(process.env.CP_TRACKING_KEY);
  const legacyAuth = toAuth(process.env.CP_API_KEY);

  return {
    ratingAuth: ratingAuth ?? legacyAuth,
    shippingAuth: shippingAuth ?? legacyAuth,
    trackingAuth: trackingAuth ?? legacyAuth,
  };
}

export function getCpConfig(): CpConfig | null {
  const { ratingAuth, shippingAuth, trackingAuth } = resolveAuths();
  const customerNumber = process.env.CP_CUSTOMER_NUMBER?.trim();
  if ((!trackingAuth && !shippingAuth && !ratingAuth) || !customerNumber) return null;

  const env = (process.env.CP_ENV || 'sandbox').toLowerCase();
  const mode = (process.env.CP_MODE || 'non-contract').toLowerCase() === 'contract'
    ? 'contract'
    : 'non-contract';

  return {
    ratingAuth,
    shippingAuth,
    trackingAuth,
    customerNumber,
    mode,
    baseUrl: env === 'production'
      ? 'https://soa-gw.canadapost.ca'
      : 'https://ct.soa-gw.canadapost.ca',
    originPostal: (process.env.CP_ORIGIN_POSTAL || '').replace(/\s/g, '').toUpperCase(),
    shippingPointId: process.env.CP_SHIPPING_POINT_ID?.trim() || undefined,
  };
}

export function isCanadaPostConfigured(): boolean {
  return getCpConfig() !== null;
}

/* ── XML helpers ─────────────────────────────────────────────────────── */

export function escXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Tiny element builder: el('city', 'Calgary') → '<city>Calgary</city>' */
function el(name: string, value: string | number | undefined | null): string {
  if (value === undefined || value === null || value === '') return '';
  return `<${name}>${escXml(String(value))}</${name}>`;
}

function textOf(xml: string, tag: string): string | null {
  const m = xml.match(new RegExp(`<[^>]*:?${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</[^>]*:?${tag}>`));
  return m ? decodeXml(m[1].trim()) : null;
}

function decodeXml(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

/** All <link rel="..." href="..."> entries from a CP response. */
export function parseLinks(xml: string): Record<string, string> {
  const links: Record<string, string> = {};
  const re = /<link\b[^>]*>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    const tag = m[0];
    const rel = tag.match(/rel="([^"]+)"/)?.[1];
    const href = tag.match(/href="([^"]+)"/)?.[1];
    if (rel && href) links[rel] = href;
  }
  return links;
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

function parseErrorBody(body: string): { code: string | null; description: string } {
  const code = textOf(body, 'code');
  const description = textOf(body, 'description');
  return { code: code || null, description: description || 'Canada Post request failed.' };
}

async function cpFetch(
  cfg: CpConfig,
  url: string,
  init: { method: 'GET' | 'POST' | 'DELETE'; accept: string; contentType?: string; body?: string; auth?: string | null },
): Promise<{ status: number; body: string }> {
  // Per-service auth when the caller names it; otherwise the first available
  // header (a single shared key sets all three to the same value).
  const auth = init.auth ?? cfg.trackingAuth ?? cfg.shippingAuth ?? cfg.ratingAuth;
  if (!auth) throw new CanadaPostError('Canada Post credentials are not configured.');
  const res = await fetch(url, {
    method: init.method,
    headers: {
      Authorization: auth,
      Accept: init.accept,
      'Accept-Language': 'en-CA',
      ...(init.contentType ? { 'Content-Type': init.contentType } : {}),
    },
    body: init.body,
    cache: 'no-store',
  });
  const body = await res.text();
  return { status: res.status, body };
}

function assertOk(status: number, body: string): void {
  if (status >= 200 && status < 300) return;
  const { code, description } = parseErrorBody(body);
  throw new CanadaPostError(
    code ? `Canada Post ${code}: ${description}` : `Canada Post HTTP ${status}: ${description}`,
    code,
  );
}

/* ── Address / parcel input shared by both shipping modes ────────────── */

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
  reference?: string; // stored as customer-ref-1 (shows in Track)
  orderTotalCad?: number; // customs value for US/international
};

function normalizePostal(postal: string, country: string): string {
  const raw = postal.replace(/\s/g, '').toUpperCase();
  return country === 'CA' ? raw : raw; // US format kept as-is (5 or 5-4)
}

function addressXml(addr: CpAddress, opts: { requirePhone: boolean }): string {
  return [
    el('name', addr.name),
    el('company', addr.company),
    opts.requirePhone ? el('client-voice-number', addr.phone) : '',
    '<address-details>',
    el('address-line-1', addr.addressLine1),
    el('address-line-2', addr.addressLine2),
    el('city', addr.city),
    el('prov-state', addr.province),
    el('country-code', addr.countryCode),
    el('postal-zip-code', normalizePostal(addr.postalCode, addr.countryCode)),
    '</address-details>',
  ].join('');
}

const DOMESTIC_SERVICES = /^DOM\./;

function isDomestic(serviceCode: string): boolean {
  return DOMESTIC_SERVICES.test(serviceCode);
}

/* ── Non-Contract shipment (v4) ──────────────────────────────────────── */

const NC_V4 = 'application/vnd.cpc.ncshipment-v4+xml';

export function buildNcShipmentXml(input: CpShipmentInput): string {
  const intl = !isDomestic(input.serviceCode);
  const dims = input.parcel.lengthCm && input.parcel.widthCm && input.parcel.heightCm
    ? '<dimensions>'
      + el('length', input.parcel.lengthCm!.toFixed(1))
      + el('width', input.parcel.widthCm!.toFixed(1))
      + el('height', input.parcel.heightCm!.toFixed(1))
      + '</dimensions>'
    : '';

  const customs = intl
    ? '<customs>'
      + el('currency', 'CAD')
      + el('reason-for-export', 'SOG')
      + '</customs>'
    : '';

  const notification = input.email
    ? '<notification>'
      + el('email', input.email)
      + '<on-shipment>true</on-shipment>'
      + '<on-exception>true</on-exception>'
      + '<on-delivery>true</on-delivery>'
      + '</notification>'
    : '';

  return `<?xml version="1.0" encoding="utf-8"?>
<non-contract-shipment xmlns="http://www.canadapost.ca/ws/ncshipment-v4">
<delivery-spec>
${el('service-code', input.serviceCode)}
<sender>
${el('name', input.sender.name)}
${el('company', input.sender.company)}
${el('contact-phone', input.sender.phone)}
<address-details>
${el('address-line-1', input.sender.addressLine1)}
${el('address-line-2', input.sender.addressLine2)}
${el('city', input.sender.city)}
${el('prov-state', input.sender.province)}
${el('postal-zip-code', normalizePostal(input.sender.postalCode, 'CA'))}
</address-details>
</sender>
<destination>
${addressXml(input.destination, { requirePhone: !isDomestic(input.serviceCode) && /USA\.|INT\.(XP|TP)/.test(input.serviceCode) })}
</destination>
${customs}
<parcel-characteristics>
${el('weight', input.parcel.weightKg.toFixed(3))}
${dims}
</parcel-characteristics>
${notification}
<preferences>
<show-packing-instructions>true</show-packing-instructions>
</preferences>
${input.reference ? '<references>' + el('customer-ref-1', input.reference) + '</references>' : ''}
</delivery-spec>
</non-contract-shipment>`;
}

export type CpShipmentResult = {
  pin: string | null;
  links: Record<string, string>; // self, label, details, (receipt)
  price: { due: number | null; gst: number | null; pst: number | null } | null;
};

export async function createNcShipment(
  input: CpShipmentInput,
  cfgOverride?: CpConfig,
): Promise<CpShipmentResult> {
  const cfg = cfgOverride ?? getCpConfig();
  if (!cfg) throw new CanadaPostError('Canada Post is not configured.');

  const url = `${cfg.baseUrl}/rs/${cfg.customerNumber}/ncshipment`;
  const { status, body } = await cpFetch(cfg, url, {
    method: 'POST',
    accept: NC_V4,
    contentType: NC_V4,
    body: buildNcShipmentXml(input),
    auth: cfg.shippingAuth,
  });
  assertOk(status, body);

  const links = parseLinks(body);
  const due = textOf(body, 'due-amount') ?? textOf(body, 'due');
  const gst = textOf(body, 'gst-amount') ?? textOf(body, 'gst');
  const pst = textOf(body, 'pst-amount') ?? textOf(body, 'pst');

  return {
    pin: textOf(body, 'pin') ?? textOf(body, 'tracking-pin'),
    links,
    price: due !== null || gst !== null || pst !== null
      ? { due: due ? Number(due) : null, gst: gst ? Number(gst) : null, pst: pst ? Number(pst) : null }
      : null,
  };
}

/* ── Contract shipment (v8) ──────────────────────────────────────────── */

const SHIPMENT_V8 = 'application/vnd.cpc.shipment-v8+xml';

export function buildContractShipmentXml(input: CpShipmentInput, groupId: string): string {
  // Same delivery-spec shape as nc-shipment; wrapped in <shipment> with a
  // namespaced group-id (required by the v8 schema).
  const inner = buildNcShipmentXml(input)
    .replace(/^<\?xml[^>]*\?>\s*/, '')
    .replace('<non-contract-shipment xmlns="http://www.canadapost.ca/ws/ncshipment-v4">', '')
    .replace('</non-contract-shipment>', '')
    .trim();

  return `<?xml version="1.0" encoding="utf-8"?>
<shipment xmlns="http://www.canadapost.ca/ws/shipment-v8" xmlns:v8="http://www.canadapost.ca/ws/shipment-v8">
<group-id>${escXml(groupId)}</group-id>
<requested-shipping-point>${escXml('')}</requested-shipping-point>
<delivery-spec>
${inner}
</delivery-spec>
</shipment>`;
}

export async function createContractShipment(
  input: CpShipmentInput,
  groupId: string,
  cfgOverride?: CpConfig,
): Promise<CpShipmentResult> {
  const cfg = cfgOverride ?? getCpConfig();
  if (!cfg) throw new CanadaPostError('Canada Post is not configured.');

  const url = `${cfg.baseUrl}/rs/${cfg.customerNumber}/${cfg.customerNumber}/shipment`;
  const { status, body } = await cpFetch(cfg, url, {
    method: 'POST',
    accept: SHIPMENT_V8,
    contentType: SHIPMENT_V8,
    body: buildContractShipmentXml(input, groupId),
    auth: cfg.shippingAuth,
  });
  assertOk(status, body);

  const links = parseLinks(body);
  return { pin: textOf(body, 'tracking-pin') ?? textOf(body, 'pin'), links, price: null };
}

/* ── Manifest (contract mode) ────────────────────────────────────────── */

const MANIFEST_V8 = 'application/vnd.cpc.manifest-v8+xml';

export async function transmitShipments(
  groupIds: string[],
  cfgOverride?: CpConfig,
): Promise<{ manifestLinks: string[] }> {
  const cfg = cfgOverride ?? getCpConfig();
  if (!cfg) throw new CanadaPostError('Canada Post is not configured.');

  const xml = `<?xml version="1.0" encoding="utf-8"?>
<transmit-set xmlns="http://www.canadapost.ca/ws/manifest-v8">
<group-ids>
${groupIds.map((g) => el('group-id', g)).join('')}
</group-ids>
${cfg.shippingPointId
    ? el('shipping-point-id', cfg.shippingPointId)
    : el('requested-shipping-point', cfg.originPostal)}
<method-of-payment>Account</method-of-payment>
<manifest-address>
${el('company', 'Loving Charmz')}
<address-details>
${el('city', '')}
${el('prov-state', '')}
${el('country-code', 'CA')}
${el('postal-zip-code', cfg.originPostal)}
</address-details>
</manifest-address>
</transmit-set>`;

  const url = `${cfg.baseUrl}/rs/${cfg.customerNumber}/${cfg.customerNumber}/manifest`;
  const { status, body } = await cpFetch(cfg, url, {
    method: 'POST',
    accept: MANIFEST_V8,
    contentType: MANIFEST_V8,
    body: xml,
    auth: cfg.shippingAuth,
  });
  assertOk(status, body);

  // Response contains <link rel="manifest" href="..."> entries.
  const links = parseLinks(body);
  const manifestLinks = Object.entries(links)
    .filter(([rel]) => rel === 'manifest' || rel === 'self')
    .map(([, href]) => href);
  return { manifestLinks };
}

export async function voidShipment(
  links: Record<string, string>,
  cfgOverride?: CpConfig,
): Promise<void> {
  const cfg = cfgOverride ?? getCpConfig();
  if (!cfg) throw new CanadaPostError('Canada Post is not configured.');
  const href = links.voidShipment ?? links['void-shipment'] ?? links.self;
  if (!href) throw new CanadaPostError('No void link stored for this shipment.');

  const { status, body } = await cpFetch(cfg, href, {
    method: 'DELETE',
    accept: SHIPMENT_V8,
    auth: cfg.shippingAuth,
  });
  // 204 = voided; some environments answer 200 with a body.
  if (status !== 204 && status !== 200) assertOk(status, body);
}

/* ── Label artifact ──────────────────────────────────────────────────── */

export async function getLabelPdf(
  labelHref: string,
  cfgOverride?: CpConfig,
): Promise<Buffer> {
  const cfg = cfgOverride ?? getCpConfig();
  if (!cfg) throw new CanadaPostError('Canada Post is not configured.');

  // First call: encode the label request (returns artifact link).
  const enc = await cpFetch(cfg, labelHref, {
    method: 'GET',
    accept: SHIPMENT_V8,
  });
  let artifactHref: string | undefined;

  if (enc.status === 200) {
    const links = parseLinks(enc.body);
    artifactHref = links.label ?? links.artifact;
  }
  if (!artifactHref && labelHref.includes('/artifact/')) {
    artifactHref = labelHref; // already an artifact link
  }
  if (!artifactHref) {
    // The label link itself may point straight at the artifact (nc flow v4).
    artifactHref = labelHref;
  }

  // Fetch the actual PDF.
  const pdf = await fetch(artifactHref!, {
    headers: { Authorization: cfg.shippingAuth ?? cfg.trackingAuth ?? cfg.ratingAuth ?? '', Accept: 'application/pdf' },
    cache: 'no-store',
  });
  if (!pdf.ok) {
    const text = await pdf.text().catch(() => '');
    const { description } = parseErrorBody(text);
    throw new CanadaPostError(`Label download failed: ${description}`);
  }
  const buf = Buffer.from(await pdf.arrayBuffer());
  if (buf.length < 100 || buf.subarray(0, 4).toString() !== '%PDF') {
    throw new CanadaPostError('Label artifact did not return a PDF (it may still be rendering — retry in a few seconds).');
  }
  return buf;
}

/* ── Tracking (v2) ───────────────────────────────────────────────────── */

const TRACK_V2 = 'application/vnd.cpc.track-v2+xml';

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
  deliveredTo: string | null;
  events: CpTrackingEvent[];
};

export function parseTrackingSummary(xml: string): CpTrackingSummary {
  const events: CpTrackingEvent[] = [];
  const eventRe = /<event>([\s\S]*?)<\/event>/g;
  let em: RegExpExecArray | null;
  while ((em = eventRe.exec(xml))) {
    const block = em[1];
    events.push({
      date: textOf(block, 'event-date'),
      time: textOf(block, 'event-time'),
      description: textOf(block, 'event-description'),
      site: textOf(block, 'event-site'),
    });
  }

  return {
    pin: textOf(xml, 'pin'),
    eventName: textOf(xml, 'event-description') ?? textOf(xml, 'event-name'),
    eventDate: textOf(xml, 'event-date'),
    eventSite: textOf(xml, 'event-site'),
    expectedDelivery: textOf(xml, 'expected-delivery-date'),
    deliveredTo: textOf(xml, 'delivery-agent-name') ?? textOf(xml, 'signed-by'),
    events,
  };
}

export async function getTrackingSummary(
  pin: string,
  cfgOverride?: CpConfig,
): Promise<CpTrackingSummary> {
  const cfg = cfgOverride ?? getCpConfig();
  if (!cfg) throw new CanadaPostError('Canada Post is not configured.');

  const url = `${cfg.baseUrl}/vis/track/pin/${encodeURIComponent(pin.trim())}/summary`;
  const { status, body } = await cpFetch(cfg, url, {
    method: 'GET',
    accept: TRACK_V2,
    auth: cfg.trackingAuth,
  });
  assertOk(status, body);
  return parseTrackingSummary(body);
}
