import { describe, expect, it, vi } from 'vitest';
import { bootstrapCharmVariants, type InitialStock } from '@/lib/admin/variant-bootstrap';

/**
 * Minimal admin-client stand-in: `select` returns the given existing rows,
 * `insert` captures whatever the bootstrap tries to create.
 */
function fakeAdmin(existing: Array<{ material: string; size: string | null }> = []) {
  const inserted: any[] = [];
  const admin = {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: existing, error: null }),
      }),
      insert: vi.fn().mockImplementation((rows: any[]) => {
        inserted.push(...rows);
        return Promise.resolve({ error: null });
      }),
    })),
  };
  return { admin, inserted };
}

describe('bootstrapCharmVariants', () => {
  it('creates all six cells when the product has no variants yet', async () => {
    const { admin, inserted } = fakeAdmin();
    await bootstrapCharmVariants(admin, 'p1', 'test-piece');

    expect(inserted).toHaveLength(6);
    expect(inserted.map((r) => `${r.material}|${r.size}`)).toEqual([
      'brass|small',
      'brass|medium',
      'brass|large',
      'stainless_steel|small',
      'stainless_steel|medium',
      'stainless_steel|large',
    ]);
  });

  it('seeds new rows with the stock entered on the product form', async () => {
    const { admin, inserted } = fakeAdmin();
    const stock: InitialStock = {
      brass: { small: 3, large: 7 },
      stainless_steel: { medium: 12 },
    };
    await bootstrapCharmVariants(admin, 'p1', 'test-piece', stock);

    const byKey = new Map(inserted.map((r) => [`${r.material}|${r.size}`, r]));
    expect(byKey.get('brass|small')?.stock_quantity).toBe(3);
    expect(byKey.get('brass|medium')?.stock_quantity).toBe(0);
    expect(byKey.get('brass|large')?.stock_quantity).toBe(7);
    expect(byKey.get('stainless_steel|medium')?.stock_quantity).toBe(12);
    expect(byKey.get('stainless_steel|large')?.stock_quantity).toBe(0);
  });

  it('ignores garbage and negatives in the initial stock', async () => {
    const { admin, inserted } = fakeAdmin();
    const stock = {
      brass: { small: -5, medium: 2.6 },
    } as InitialStock;
    await bootstrapCharmVariants(admin, 'p1', 'test-piece', stock);

    const byKey = new Map(inserted.map((r) => [`${r.material}|${r.size}`, r]));
    expect(byKey.get('brass|small')?.stock_quantity).toBe(0);
    expect(byKey.get('brass|medium')?.stock_quantity).toBe(3); // rounded
  });

  it('is idempotent: existing rows are never touched or re-created', async () => {
    const { admin, inserted } = fakeAdmin([
      { material: 'brass', size: 'small' },
      { material: 'brass', size: 'medium' },
    ]);
    await bootstrapCharmVariants(admin, 'p1', 'test-piece', { brass: { small: 9 } });

    // Only the four missing cells are inserted, and the existing brass/small
    // row does NOT get the form's stock (it would overwrite real inventory).
    expect(inserted).toHaveLength(4);
    expect(inserted.map((r) => `${r.material}|${r.size}`)).not.toContain('brass|small');
    expect(inserted.find((r) => r.material === 'brass' && r.size === 'large')?.stock_quantity).toBe(0);
  });

  it('names and SKUs new rows exactly like the matrix editor', async () => {
    const { admin, inserted } = fakeAdmin();
    await bootstrapCharmVariants(admin, 'p1', 'faithful-friend');

    const steel = inserted.find((r) => r.material === 'stainless_steel' && r.size === 'medium');
    expect(steel?.name).toBe('Stainless Steel · Medium');
    expect(steel?.sku).toBe('FAITHFUL-FRIEND-STL-M');
    expect(steel?.price_adjustment).toBe(0);
    expect(steel?.is_active).toBe(true);
  });
});
