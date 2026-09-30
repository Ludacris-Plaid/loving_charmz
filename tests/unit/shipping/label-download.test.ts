import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Regression: `downloadCanadaPostLabelAction` used to resolve the href itself
 * and hand `getLabelPdf` that string. `getLabelPdf` expects the whole links
 * record and looks up `label`/`self` on it, so every call saw `undefined` and
 * threw "Stored shipment has no label link" — the download never once reached
 * Canada Post, even though the stored record had a valid label URL.
 *
 * The bug survived review because the admin client is untyped, so the string
 * was assignable to the parameter. These tests pin the real contract.
 */

const LABEL_URL =
  'https://api.canadapost-postescanada.ca/prod/devportal-portaildesdeveloppeurs/shipping/v1/artifacts/abc/shipping/1/0';
const SELF_URL =
  'https://api.canadapost-postescanada.ca/prod/devportal-portaildesdeveloppeurs/shipping/v1/0001/0001/shipments/2';

const getLabelPdf = vi.hoisted(() => vi.fn());
const maybeSingle = vi.hoisted(() => vi.fn());

vi.mock('@/lib/shipping/canadapost', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/shipping/canadapost')>();
  return {
    ...actual,
    getLabelPdf,
    getCpConfig: () => ({ customerNumber: '0001', originPostal: 'T2T1N6' }),
  };
});

vi.mock('@/components/admin/AdminGuard', () => ({
  getSession: async () => ({ isAdmin: true }),
}));
vi.mock('@/lib/email/transactional', () => ({
  sendShippingNotification: vi.fn(async () => ({ ok: true })),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({ order: () => ({ limit: () => ({ maybeSingle }) }) }),
      }),
    }),
  }),
}));

const PDF = Buffer.from('%PDF-1.4 fake label');

beforeEach(() => {
  getLabelPdf.mockReset();
  maybeSingle.mockReset();
  getLabelPdf.mockResolvedValue(PDF);
});

async function loadAction() {
  return (await import('@/lib/shipping/actions')).downloadCanadaPostLabelAction;
}

describe('downloadCanadaPostLabelAction', () => {
  it('passes the whole links record to getLabelPdf, not a pre-resolved string', async () => {
    const links = { self: SELF_URL, label: LABEL_URL, price: `${SELF_URL}/price` };
    maybeSingle.mockResolvedValue({ data: { links, pin: '123', status: 'created' }, error: null });

    const downloadCanadaPostLabelAction = await loadAction();
    const result = await downloadCanadaPostLabelAction('order-1');

    expect(result.error).toBeUndefined();
    expect(result.pdfBase64).toBe(PDF.toString('base64'));
    // The regression: this must be an object with a `label`, not a bare string.
    expect(getLabelPdf).toHaveBeenCalledTimes(1);
    const arg = getLabelPdf.mock.calls[0][0];
    expect(typeof arg).toBe('object');
    expect(arg).toMatchObject({ label: LABEL_URL });
  });

  it('still downloads when only a self link was stored', async () => {
    maybeSingle.mockResolvedValue({
      data: { links: { self: SELF_URL }, pin: '123', status: 'created' },
      error: null,
    });

    const downloadCanadaPostLabelAction = await loadAction();
    const result = await downloadCanadaPostLabelAction('order-1');

    expect(result.error).toBeUndefined();
    expect(getLabelPdf.mock.calls[0][0]).toMatchObject({ self: SELF_URL });
  });

  it('reports a missing link only when the record genuinely has neither', async () => {
    maybeSingle.mockResolvedValue({ data: { links: {}, pin: null, status: 'created' }, error: null });

    const downloadCanadaPostLabelAction = await loadAction();
    const result = await downloadCanadaPostLabelAction('order-1');

    expect(result.error).toBe('Stored shipment has no label link.');
    expect(getLabelPdf).not.toHaveBeenCalled();
  });

  it('reports a friendly error when the order has no shipment at all', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });

    const downloadCanadaPostLabelAction = await loadAction();
    const result = await downloadCanadaPostLabelAction('order-1');

    expect(result.error).toBe('No Canada Post label for this order.');
    expect(getLabelPdf).not.toHaveBeenCalled();
  });

  it('surfaces a Canada Post failure as the action error', async () => {
    const { CanadaPostError } = await import('@/lib/shipping/canadapost');
    maybeSingle.mockResolvedValue({
      data: { links: { self: SELF_URL, label: LABEL_URL }, pin: '1', status: 'created' },
      error: null,
    });
    getLabelPdf.mockRejectedValue(new CanadaPostError('Label download failed: HTTP 500'));

    const downloadCanadaPostLabelAction = await loadAction();
    const result = await downloadCanadaPostLabelAction('order-1');

    expect(result.error).toBe('Label download failed: HTTP 500');
  });
});
