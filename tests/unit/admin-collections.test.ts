import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------
// upsertCollectionAction now owns collection membership, so these
// tests pin the part that used to have no admin writer at all: the
// product list is parsed from the form and rewritten in order.
// ---------------------------------------------------------------

const db = vi.hoisted(() => {
  const state = {
    insertedCollection: null as Record<string, unknown> | null,
    updatedCollection: null as Record<string, unknown> | null,
    deletedFromMembership: [] as string[],
    membershipRows: [] as Record<string, unknown>[],
  };

  function builderFor(table: string) {
    let op: string | null = null;
    let payload: any = null;
    const filters: [string, unknown][] = [];

    function settle() {
      if (table === 'collections' && op === 'insert') {
        const row = { id: 'col-1', ...payload };
        state.insertedCollection = row;
        return { data: row, error: null };
      }
      if (table === 'collections' && op === 'update') {
        state.updatedCollection = payload;
        return { data: null, error: null };
      }
      if (table === 'collection_products' && op === 'delete') {
        state.deletedFromMembership.push(String(filters[0]?.[1]));
        return { data: null, error: null };
      }
      if (table === 'collection_products' && op === 'insert') {
        state.membershipRows.push(...(Array.isArray(payload) ? payload : [payload]));
        return { data: null, error: null };
      }
      return { data: null, error: null };
    }

    const builder: any = {
      // `.insert(...).select('id').single()` chains: select() must not
      // overwrite the operation the insert already set.
      select: () => {
        if (op === null) op = 'select';
        return builder;
      },
      insert: (value: unknown) => {
        op = 'insert';
        payload = value;
        return builder;
      },
      update: (value: unknown) => {
        op = 'update';
        payload = value;
        return builder;
      },
      delete: () => {
        op = 'delete';
        return builder;
      },
      eq: (column: string, value: unknown) => {
        filters.push([column, value]);
        return builder;
      },
      single: () => ({
        then: (resolve: any, reject: any) => Promise.resolve(settle()).then(resolve, reject),
      }),
      then: (resolve: any, reject: any) => Promise.resolve(settle()).then(resolve, reject),
    };
    return builder;
  }

  return { state, builderFor };
});

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => ({ from: db.builderFor }) }));
vi.mock('@/components/admin/AdminGuard', () => ({
  getSession: async () => ({ isAdmin: true }),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

function collectionForm(fields: Record<string, string> = {}) {
  const fd = new FormData();
  fd.set('name', 'Memorial');
  fd.set('slug', 'memorial');
  fd.set('is_active', 'on');
  for (const [key, value] of Object.entries(fields)) fd.set(key, value);
  return fd;
}

beforeEach(() => {
  db.state.insertedCollection = null;
  db.state.updatedCollection = null;
  db.state.deletedFromMembership = [];
  db.state.membershipRows = [];
});

describe('upsertCollectionAction product membership', () => {
  it('writes the chosen products with their display order', async () => {
    const { upsertCollectionAction } = await import('@/lib/admin/collections-and-variants');
    const res = await upsertCollectionAction(
      collectionForm({ productIds: JSON.stringify(['p-2', 'p-1', 'p-3']) }),
    );

    expect(res.error).toBeUndefined();
    expect(db.state.insertedCollection?.slug).toBe('memorial');
    expect(db.state.deletedFromMembership).toEqual(['col-1']);
    expect(db.state.membershipRows).toEqual([
      { collection_id: 'col-1', product_id: 'p-2', sort_order: 0 },
      { collection_id: 'col-1', product_id: 'p-1', sort_order: 1 },
      { collection_id: 'col-1', product_id: 'p-3', sort_order: 2 },
    ]);
  });

  it('clears membership when no products are ticked', async () => {
    const { upsertCollectionAction } = await import('@/lib/admin/collections-and-variants');
    const res = await upsertCollectionAction(collectionForm({ id: 'col-9' }));

    expect(res.error).toBeUndefined();
    expect(db.state.updatedCollection).toMatchObject({ slug: 'memorial' });
    expect(db.state.deletedFromMembership).toEqual(['col-9']);
    expect(db.state.membershipRows).toEqual([]);
  });

  it('ignores a malformed product list rather than failing the save', async () => {
    const { upsertCollectionAction } = await import('@/lib/admin/collections-and-variants');
    const res = await upsertCollectionAction(collectionForm({ productIds: 'not-json' }));

    expect(res.error).toBeUndefined();
    expect(db.state.membershipRows).toEqual([]);
  });

  it('drops non-string entries from the submitted list', async () => {
    const { upsertCollectionAction } = await import('@/lib/admin/collections-and-variants');
    const res = await upsertCollectionAction(
      collectionForm({ productIds: JSON.stringify(['p-1', 42, null, 'p-2']) }),
    );

    expect(res.error).toBeUndefined();
    expect(db.state.membershipRows.map((r) => r.product_id)).toEqual(['p-1', 'p-2']);
  });
});