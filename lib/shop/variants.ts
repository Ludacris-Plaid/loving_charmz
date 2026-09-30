/**
 * Variant-matrix helpers.
 *
 * The shop sells one kind of product: charms in brass or stainless steel,
 * each in small / medium / large. One variant row per material×size
 * combination (6 cells per product). These pure functions are used by the
 * storefront selectors and the admin matrix editor, and are unit-tested in
 * tests/unit/variant-matrix.test.ts.
 */

export const CHARM_MATERIALS = ['brass', 'stainless_steel'] as const;
export const CHARM_SIZES = ['small', 'medium', 'large'] as const;

export type CharmMaterial = (typeof CHARM_MATERIALS)[number];
export type VariantMaterial = CharmMaterial;
export type VariantSize = (typeof CHARM_SIZES)[number];

export const MATERIAL_LABELS: Record<string, string> = {
  brass: 'Brass',
  stainless_steel: 'Stainless Steel',
};

export const SIZE_LABELS: Record<string, string> = {
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
};

/** SKU fragment per material, matching the migration's scheme. */
const MATERIAL_SKU_CODES: Record<VariantMaterial, string> = {
  brass: 'BRASS',
  stainless_steel: 'STL',
};

const SIZE_SKU_CODES: Record<VariantSize, string> = {
  small: 'S',
  medium: 'M',
  large: 'L',
};

export type VariantLike = {
  id: string;
  /** Human label as stored on the row, e.g. "Brass · Large". */
  name?: string;
  material: string | null;
  size: string | null;
  price_adjustment: number;
  stock_quantity: number;
  is_active: boolean;
};

export type ProductLike = {
  base_price: number;
  slug?: string;
};

/** Materials present among a product's variants, in canonical order. */
export function availableMaterials(variants: VariantLike[]): string[] {
  const present = new Set(
    variants.filter((v) => v.is_active && v.material).map((v) => v.material as string),
  );
  return CHARM_MATERIALS.filter((m) => present.has(m));
}

/** Sizes available for a given material among the product's variants. */
export function availableSizes(variants: VariantLike[], material: string): string[] {
  const present = new Set(
    variants
      .filter((v) => v.is_active && v.material === material && v.size)
      .map((v) => v.size as string),
  );
  return CHARM_SIZES.filter((s) => present.has(s));
}

/** Finds the variant for a material + size combo. */
export function findVariant(
  variants: VariantLike[],
  material: string,
  size: string,
): VariantLike | undefined {
  return variants.find(
    (v) => v.is_active && v.material === material && v.size === size,
  );
}

/** Selling price of a variant: product base + its adjustment. */
export function variantPrice(product: ProductLike, variant?: VariantLike | null): number {
  return product.base_price + (variant?.price_adjustment || 0);
}

/**
 * The lowest price a shopper can actually pay for this product — the number a
 * "From $X" card must quote. Falls back to the base price when the product has
 * no active variants, and never returns less than zero.
 */
export function lowestVariantPrice(
  product: ProductLike,
  variants: Pick<VariantLike, 'price_adjustment' | 'is_active'>[],
): number {
  const active = variants.filter((v) => v.is_active);
  if (active.length === 0) return Math.max(0, product.base_price);
  const lowest = Math.min(
    ...active.map((v) => product.base_price + (Number(v.price_adjustment) || 0)),
  );
  return Math.max(0, lowest);
}

/** "Brass · Large" — the human label stored on the variant row. */
export function variantDisplayName(material: string, size: string | null): string {
  return size
    ? `${MATERIAL_LABELS[material] || material} · ${SIZE_LABELS[size] || size}`
    : MATERIAL_LABELS[material] || material;
}

/** SKU fragment from a product slug: "Faithful Friend" → "FAITHFUL-FRIEND". */
export function skuRoot(slug: string): string {
  return slug
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function variantSku(slug: string, material: string, size: string | null): string {
  const parts = [skuRoot(slug), MATERIAL_SKU_CODES[material as VariantMaterial] || material.toUpperCase()];
  if (size) parts.push(SIZE_SKU_CODES[size as VariantSize] || size.toUpperCase());
  return parts.join('-');
}

/** The 6 charm matrix cells in display order (brass S/M/L, steel S/M/L). */
export function charmMatrixCells(): Array<{ material: string; size: string }> {
  return CHARM_MATERIALS.flatMap((m) =>
    CHARM_SIZES.map((s) => ({ material: m as string, size: s as string })),
  );
}
