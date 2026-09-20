/**
 * Variant bootstrap helpers — plain functions (not server actions) shared by
 * the product create/update actions. Each is idempotent: existing variant
 * rows are never touched, only missing matrix cells are inserted.
 */
import {
  CHARM_MATERIALS,
  CHARM_SIZES,
  JEWELRY_MATERIALS,
  variantDisplayName,
  variantSku,
} from '@/lib/shop/variants';

type AdminClient = {
  from: (table: string) => any;
};

/** Standard jewelry price adjustments matching the live catalog. */
const JEWELRY_ADJUSTMENTS: Record<string, number> = {
  sterling_silver: 0,
  rose_gold: 100,
  gold_14k: 120,
};

/** Charm matrix price adjustments. */
const CHARM_ADJUSTMENTS: Record<string, number> = {
  brass: 0,
  stainless_steel: 25,
};

/**
 * Creates any missing charm variants (2 materials × 3 sizes = 6 cells).
 * Existing rows are left untouched, so stock is never reset.
 */
export async function bootstrapCharmVariants(
  admin: AdminClient,
  productId: string,
  slug: string,
): Promise<void> {
  const { data: existing } = await admin
    .from('product_variants')
    .select('material, size')
    .eq('product_id', productId);

  const have = new Set(
    (existing || []).map((v: any) => `${v.material}|${v.size}`),
  );

  const missing = CHARM_MATERIALS.flatMap((material) =>
    CHARM_SIZES.map((size) => ({ material, size })),
  ).filter((c) => !have.has(`${c.material}|${c.size}`));

  if (missing.length === 0) return;

  const rows = missing.map((c) => ({
    product_id: productId,
    name: variantDisplayName(c.material, c.size),
    sku: variantSku(slug, c.material, c.size),
    price_adjustment: CHARM_ADJUSTMENTS[c.material] || 0,
    stock_quantity: 0,
    is_active: true,
    material: c.material,
    size: c.size,
  }));

  const { error } = await admin.from('product_variants').insert(rows);
  if (error) throw new Error(error.message);
}

/**
 * Creates any missing jewelry variants (one per standard material).
 * Size stays null — jewelry is not sold in sizes yet.
 */
export async function bootstrapJewelryVariants(
  admin: AdminClient,
  productId: string,
  slug: string,
): Promise<void> {
  const { data: existing } = await admin
    .from('product_variants')
    .select('material, size')
    .eq('product_id', productId);

  const have = new Set(
    (existing || []).map((v: any) => v.material as string),
  );

  const missing = JEWELRY_MATERIALS.filter((m) => !have.has(m));

  if (missing.length === 0) return;

  const rows = missing.map((material) => ({
    product_id: productId,
    name: variantDisplayName(material, null),
    sku: variantSku(slug, material, null),
    price_adjustment: JEWELRY_ADJUSTMENTS[material] || 0,
    stock_quantity: 0,
    is_active: true,
    material,
    size: null,
  }));

  const { error } = await admin.from('product_variants').insert(rows);
  if (error) throw new Error(error.message);
}
