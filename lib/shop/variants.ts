/**
 * Shared variant-matrix helpers.
 *
 * A "charm" product has one variant row per material×size combination
 * (6 cells). Jewelry has material-only variants (size = null). These
 * pure functions are used by the storefront selectors and the admin
 * matrix editor, and are unit-tested in tests/unit/variant-matrix.test.ts.
 */

export const CHARM_MATERIALS = ['brass', 'stainless_steel'] as const;
export const CHARM_SIZES = ['small', 'medium', 'large'] as const;

export const JEWELRY_MATERIALS = [
  'sterling_silver',
  'gold_14k',
  'rose_gold',
] as const;

export type CharmMaterial = (typeof CHARM_MATERIALS)[number];
export type JewelryMaterial = (typeof JEWELRY_MATERIALS)[number];
export type VariantMaterial = CharmMaterial | JewelryMaterial;
export type VariantSize = (typeof CHARM_SIZES)[number];

export const MATERIAL_LABELS: Record<string, string> = {
  brass: 'Brass',
  stainless_steel: 'Stainless Steel',
  sterling_silver: 'Sterling Silver',
  gold_14k: '14K Gold',
  rose_gold: 'Rose Gold',
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
  sterling_silver: 'SS',
  gold_14k: '14K',
  rose_gold: 'RG',
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
  kind: string | null;
  base_price: number;
  slug?: string;
};

/** Materials present among a product's variants, in canonical order. */
export function availableMaterials(variants: VariantLike[]): string[] {
  const order = [...CHARM_MATERIALS, ...JEWELRY_MATERIALS];
  const present = new Set(
    variants.filter((v) => v.is_active && v.material).map((v) => v.material as string),
  );
  return order.filter((m) => present.has(m));
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

/** Finds the variant for a material (+ optional size) combo. */
export function findVariant(
  variants: VariantLike[],
  material: string,
  size: string | null,
): VariantLike | undefined {
  return variants.find(
    (v) => v.is_active && v.material === material && (size ? v.size === size : !v.size),
  );
}

/** Selling price of a variant: product base + its adjustment. */
export function variantPrice(product: ProductLike, variant?: VariantLike | null): number {
  return product.base_price + (variant?.price_adjustment || 0);
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
