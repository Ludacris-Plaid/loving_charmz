import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockUpload = vi.fn();
const mockGetPublicUrl = vi.fn();
const mockRemove = vi.fn();
const mockFrom = vi.fn();
const mockGetSession = vi.fn();
const mockCreateAdminClient = vi.fn();

vi.mock('@/components/admin/AdminGuard', () => ({
  getSession: () => mockGetSession(),
}));
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => mockCreateAdminClient(),
}));
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

function makeFile(name: string, type: string, size: number): File {
  const f = new File([new Uint8Array(size)], name, { type });
  return f;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFrom.mockImplementation((bucket: string) => ({
    upload: (path: string, file: File, opts: unknown) => mockUpload(path, file, opts),
    getPublicUrl: (path: string) => mockGetPublicUrl(path),
    remove: (paths: string[]) => mockRemove(paths),
  }));
  mockCreateAdminClient.mockReturnValue({ storage: { from: mockFrom } });
});

describe('uploadProductImageAction', () => {
  it('returns error for non-admin session', async () => {
    mockGetSession.mockResolvedValue({ userId: 'u1', email: 'x', isAdmin: false });
    const { uploadProductImageAction } = await import('@/lib/admin/actions');
    const res = await uploadProductImageAction(makeFile('a.png', 'image/png', 100));
    expect(res).toEqual({ error: 'Admin permission required' });
  });

  it('returns error for unsupported MIME type', async () => {
    mockGetSession.mockResolvedValue({ userId: 'u1', email: 'x', isAdmin: true });
    const { uploadProductImageAction } = await import('@/lib/admin/actions');
    const res = await uploadProductImageAction(makeFile('a.gif', 'image/gif', 100));
    expect(res.error).toMatch(/Unsupported type/);
  });

  it('returns error for empty file', async () => {
    mockGetSession.mockResolvedValue({ userId: 'u1', email: 'x', isAdmin: true });
    const { uploadProductImageAction } = await import('@/lib/admin/actions');
    const res = await uploadProductImageAction(makeFile('a.png', 'image/png', 0));
    expect(res.error).toMatch(/empty/i);
  });

  it('returns error for file larger than 5MB', async () => {
    mockGetSession.mockResolvedValue({ userId: 'u1', email: 'x', isAdmin: true });
    const { uploadProductImageAction } = await import('@/lib/admin/actions');
    const res = await uploadProductImageAction(makeFile('big.png', 'image/png', 6 * 1024 * 1024));
    expect(res.error).toMatch(/too large/i);
  });

  it('uploads to products/draft when no product slug is given', async () => {
    mockGetSession.mockResolvedValue({ userId: 'u1', email: 'x', isAdmin: true });
    mockUpload.mockResolvedValue({ error: null });
    mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://x.supabase.co/storage/v1/object/public/product-images/products/draft/1234-a.png' } });
    const { uploadProductImageAction } = await import('@/lib/admin/actions');
    const res = await uploadProductImageAction(makeFile('a.png', 'image/png', 100));
    expect(res.error).toBeUndefined();
    expect(res.url).toContain('/product-images/products/draft/');
    expect(mockUpload).toHaveBeenCalledOnce();
    const [path, , opts] = mockUpload.mock.calls[0];
    expect(path).toMatch(/^products\/draft\//);
    expect(opts).toMatchObject({ contentType: 'image/png', upsert: false });
  });

  it('uploads to products/{slug} when product slug is given', async () => {
    mockGetSession.mockResolvedValue({ userId: 'u1', email: 'x', isAdmin: true });
    mockUpload.mockResolvedValue({ error: null });
    mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://x/product-images/products/loyal-companion/123-a.png' } });
    const { uploadProductImageAction } = await import('@/lib/admin/actions');
    const res = await uploadProductImageAction(makeFile('a.png', 'image/png', 100), 'Loyal Companion!');
    expect(res.url).toContain('/products/loyal-companion/');
    const [path] = mockUpload.mock.calls[0];
    expect(path).toMatch(/^products\/loyal-companion\//);
  });

  it('returns the upload error message if storage fails', async () => {
    mockGetSession.mockResolvedValue({ userId: 'u1', email: 'x', isAdmin: true });
    mockUpload.mockResolvedValue({ error: { message: 'Bucket not found' } });
    const { uploadProductImageAction } = await import('@/lib/admin/actions');
    const res = await uploadProductImageAction(makeFile('a.png', 'image/png', 100));
    expect(res.error).toBe('Bucket not found');
  });
});

describe('deleteProductImageAction', () => {
  it('returns error for non-admin session', async () => {
    mockGetSession.mockResolvedValue({ userId: 'u1', email: 'x', isAdmin: false });
    const { deleteProductImageAction } = await import('@/lib/admin/actions');
    const res = await deleteProductImageAction('https://x/product-images/products/draft/a.png');
    expect(res).toEqual({ error: 'Admin permission required' });
  });

  it('returns error for URL not referencing product-images bucket', async () => {
    mockGetSession.mockResolvedValue({ userId: 'u1', email: 'x', isAdmin: true });
    const { deleteProductImageAction } = await import('@/lib/admin/actions');
    const res = await deleteProductImageAction('https://x/avatars/a.png');
    expect(res.error).toMatch(/product-images/);
  });

  it('extracts path and calls storage.remove with it', async () => {
    mockGetSession.mockResolvedValue({ userId: 'u1', email: 'x', isAdmin: true });
    mockRemove.mockResolvedValue({ error: null });
    const { deleteProductImageAction } = await import('@/lib/admin/actions');
    const url = 'https://otareqhvjbcbiehmgzda.supabase.co/storage/v1/object/public/product-images/products/loyal-companion/123-a.png?t=1';
    const res = await deleteProductImageAction(url);
    expect(res.error).toBeUndefined();
    expect(mockRemove).toHaveBeenCalledWith(['products/loyal-companion/123-a.png']);
  });
});
