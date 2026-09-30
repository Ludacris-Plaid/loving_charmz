/**
 * Variant bootstrap — creates the standard 6-cell charm matrix for a product
 * (brass / stainless steel × S / M / L), with the stock counts the admin
 * entered on the product form.
 *
 * Plain functions (not server actions), shared by the product create/update
 * actions. Existing variant rows are never touched — only missing matrix
 * cells are inserted, so re-running never resets stock.
 */
import { CHARM_MATERIALS, CHARM_SIZES, variantDisplayName, variantSku } from '@/lib/shop/variants';

type AdminClient = {
  from: (table: string) => any;
};

/** Stock entered per material/size on the product form; absent = 0. */
export type InitialStock = {
  [K in (typeof CHARM_MATERIALS)[number]]?: Partial<
    Record<(typeof CHARM_SIZES)[number], number>
  >;
};

/**
 * Charm matrix price adjustments. The admin's entered price is the price for
 * every version, so every cell is zero — kept as an explicit table so any
 * future per-version pricing has one obvious place to change.
 */
const CHARM_ADJUSTMENTS: Record<string, number> = {
  brass: 0,
  stainless_steel: 0,
};

/**
 * Creates any missing charm variants (2 materials × 3 sizes = 6 cells).
 * Existing rows are left untouched, so stock is never reset. New rows get
 * their stock from `initialStock`; the rest start at zero.
 */
export async function bootstrapCharmVariants(
  admin: AdminClient,
  productId: string,
  slug: string,
  initialStock: InitialStock = {},
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
    stock_quantity: Math.max(0, Math.round(initialStock[c.material]?.[c.size] ?? 0)),
    is_active: true,
    material: c.material,
    size: c.size,
  }));

  const { error } = await admin.from('product_variants').insert(rows);
  if (error) throw new Error(error.message);
}
