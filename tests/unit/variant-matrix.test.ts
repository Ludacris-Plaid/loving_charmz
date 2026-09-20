import { describe, expect, it } from 'vitest';
import {
  availableMaterials,
  availableSizes,
  charmMatrixCells,
  findVariant,
  skuRoot,
  variantDisplayName,
  variantPrice,
  variantSku,
  type VariantLike,
} from '@/lib/shop/variants';

/** Builds a full charm matrix (2 materials × 3 sizes) as VariantLike rows. */
function charmMatrix(overrides: Partial<Record<string, Partial<VariantLike>>> = {}): VariantLike[] {
  const cells: VariantLike[] = [];
  for (const material of ['brass', 'stainless_steel']) {
    for (const size of ['small', 'medium', 'large']) {
      const key = `${material}-${size}`;
      cells.push({
        id: key,
        material,
        size,
        price_adjustment: material === 'stainless_steel' ? 25 : 0,
        stock_quantity: 5,
        is_active: true,
        ...overrides[key],
      });
    }
  }
  return cells;
}

describe('availableMaterials', () => {
  it('returns materials in canonical order, ignoring inactive variants', () => {
    const variants = charmMatrix({ 'brass-medium': { is_active: false } });
    expect(availableMaterials(variants)).toEqual(['brass', 'stainless_steel']);
  });

  it('returns an empty list when every variant is inactive', () => {
    const variants = charmMatrix().map((v) => ({ ...v, is_active: false }));
    expect(availableMaterials(variants)).toEqual([]);
  });

  it('includes jewelry materials for material-only variant sets', () => {
    const variants: VariantLike[] = [
      { id: 'a', material: 'sterling_silver', size: null, price_adjustment: 0, stock_quantity: 5, is_active: true },
      { id: 'b', material: 'gold_14k', size: null, price_adjustment: 120, stock_quantity: 5, is_active: true },
    ];
    expect(availableMaterials(variants)).toEqual(['sterling_silver', 'gold_14k']);
  });
});

describe('availableSizes', () => {
  it('returns sizes only for the chosen material', () => {
    const variants = charmMatrix();
    expect(availableSizes(variants, 'brass')).toEqual(['small', 'medium', 'large']);
  });

  it('returns an empty list for materials without size data (jewelry)', () => {
    const variants: VariantLike[] = [
      { id: 'a', material: 'sterling_silver', size: null, price_adjustment: 0, stock_quantity: 5, is_active: true },
    ];
    expect(availableSizes(variants, 'sterling_silver')).toEqual([]);
  });

  it('excludes sizes whose only variant is inactive or out of the material', () => {
    const variants = charmMatrix({ 'brass-large': { is_active: false } });
    expect(availableSizes(variants, 'brass')).toEqual(['small', 'medium']);
  });
});

describe('findVariant', () => {
  it('resolves the exact material + size combo', () => {
    const variants = charmMatrix();
    expect(findVariant(variants, 'stainless_steel', 'large')?.id).toBe('stainless_steel-large');
  });

  it('matches material-only variants when size is null', () => {
    const variants: VariantLike[] = [
      { id: 'a', material: 'gold_14k', size: null, price_adjustment: 120, stock_quantity: 5, is_active: true },
    ];
    expect(findVariant(variants, 'gold_14k', null)?.id).toBe('a');
  });

  it('never returns inactive variants', () => {
    const variants = charmMatrix({ 'brass-small': { is_active: false } });
    expect(findVariant(variants, 'brass', 'small')).toBeUndefined();
  });
});

describe('pricing and labels', () => {
  it('adds the variant adjustment to the product base price', () => {
    const product = { kind: 'charm', base_price: 25 };
    const variants = charmMatrix();
    expect(variantPrice(product, findVariant(variants, 'brass', 'medium'))).toBe(25);
    expect(variantPrice(product, findVariant(variants, 'stainless_steel', 'medium'))).toBe(50);
    expect(variantPrice(product, null)).toBe(25);
  });

  it('formats display names and SKUs like the database rows', () => {
    expect(variantDisplayName('stainless_steel', 'medium')).toBe('Stainless Steel · Medium');
    expect(variantDisplayName('brass', null)).toBe('Brass');
    expect(variantSku('faithful friend', 'brass', 'large')).toBe('FAITHFUL-FRIEND-BRASS-L');
    expect(variantSku('companion', 'stainless_steel', 'small')).toBe('COMPANION-STL-S');
  });

  it('builds a SKU root from slugs with spaces or punctuation', () => {
    expect(skuRoot('Faithful Friend')).toBe('FAITHFUL-FRIEND');
    expect(skuRoot('companion')).toBe('COMPANION');
  });
});

describe('charmMatrixCells', () => {
  it('returns all 6 cells in display order', () => {
    expect(charmMatrixCells()).toEqual([
      { material: 'brass', size: 'small' },
      { material: 'brass', size: 'medium' },
      { material: 'brass', size: 'large' },
      { material: 'stainless_steel', size: 'small' },
      { material: 'stainless_steel', size: 'medium' },
      { material: 'stainless_steel', size: 'large' },
    ]);
  });
});
