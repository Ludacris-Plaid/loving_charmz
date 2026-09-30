import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------
// The Inventory page writes per-version prices. These tests pin the
// two rules that matter: a version may be priced above OR below the
// product's base price, and the final price may never reach zero.
// ---------------------------------------------------------------

const db = vi.hoisted(() => {
  const state = {
    product: { slug: 'companion', base_price: 45 } as Record<string, unknown> | null,
    existing: [
      { id: 'v-brass-s', material: 'brass', size: 'small' },
      { id: 'v-brass-m', material: 'brass', size: 'medium' },
    ] as Record<string, unknown>[],
    writes: [] as Record<string, unknown>[],
  };

  function builderFor(table: string) {
    let op: string | null = null;
    let payload: any = null;
    const filters: [string, unknown][] = [];

    function settle() {
      if (table === 'products' && op === 'select') {
        return { data: state.product, error: null };
      }
      if (table === 'product_variants' && op === 'select') {
        return { data: state.existing, error: null };
      }
      if (table === 'product_variants' && (op === 'update' || op === 'insert')) {
        state.writes.push({ op, payload });
        return { data: null, error: null };
      }
      return { data: null, error: null };
    }

    const builder: any = {
      select: () => {
        if (op === null) op = 'select';
        return builder;
      },
      insert: (v: unknown) => { op = 'insert'; payload = v; return builder; },
      update: (v: unknown) => { op = 'update'; payload = v; return builder; },
      eq: (column: string, value: unknown) => { filters.push([column, value]); return builder; },
      maybeSingle: () => ({
        then: (res: any, rej: any) => Promise.resolve(settle()).then(res, rej),
      }),
      then: (res: any, rej: any) => Promise.resolve(settle()).then(res, rej),
    };
    return builder;
  }

  return { state, builderFor };
});

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => ({ from: db.builderFor }) }));
vi.mock('@/components/admin/AdminGuard', () => ({ getSession: async () => ({ isAdmin: true }) }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const row = (over: Partial<Record<string, unknown>> = {}) => ({
  material: 'brass',
  size: 'small',
  stock_quantity: 5,
  price_adjustment: 0,
  is_active: true,
  ...over,
});

beforeEach(() => {
  db.state.writes = [];
  db.state.existing = [
    { id: 'v-brass-s', material: 'brass', size: 'small' },
    { id: 'v-brass-m', material: 'brass', size: 'medium' },
  ];
});

describe('saveVariantMatrixAction pricing', () => {
  it('stores an absolute price entered for one version as an adjustment', async () => {
    const { saveVariantMatrixAction } = await import('@/lib/admin/collections-and-variants');
    // The Inventory editor shows 50.00 for steel medium on a $45 product.
    const res = await saveVariantMatrixAction('p-1', [
      row({ material: 'stainless_steel', size: 'medium', price_adjustment: 5 }),
    ]);

    expect(res.error).toBeUndefined();
    const written = db.state.writes[0];
    expect(written.op).toBe('insert');
    expect(written.payload).toMatchObject({
      price_adjustment: 5,
      sku: 'COMPANION-STL-M',
      name: 'Stainless Steel · Medium',
    });
  });

  it('allows a version priced below the base price', async () => {
    const { saveVariantMatrixAction } = await import('@/lib/admin/collections-and-variants');
    // $40 small on a $45 product = -5 adjustment.
    const res = await saveVariantMatrixAction('p-1', [
      row({ price_adjustment: -5 }),
    ]);

    expect(res.error).toBeUndefined();
    const existingWrite = db.state.writes.find((w) => w.op === 'update');
    expect(existingWrite?.payload).toMatchObject({ price_adjustment: -5 });
  });

  it('rejects a price that would reach zero, before writing anything', async () => {
    const { saveVariantMatrixAction } = await import('@/lib/admin/collections-and-variants');
    const res = await saveVariantMatrixAction('p-1', [
      row({ price_adjustment: -45 }),
    ]);

    expect(res.error).toMatch(/more than zero/i);
    expect(db.state.writes).toHaveLength(0);
  });

  it('rejects a price below zero', async () => {
    const { saveVariantMatrixAction } = await import('@/lib/admin/collections-and-variants');
    const res = await saveVariantMatrixAction('p-1', [
      row({ price_adjustment: -60 }),
    ]);

    expect(res.error).toMatch(/more than zero/i);
    expect(db.state.writes).toHaveLength(0);
  });
});