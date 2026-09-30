import { describe, expect, it } from 'vitest';
import {
  availableMaterials,
  availableSizes,
  charmMatrixCells,
  findVariant,
  lowestVariantPrice,
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
});

describe('availableSizes', () => {
  it('returns sizes only for the chosen material', () => {
    const variants = charmMatrix();
    expect(availableSizes(variants, 'brass')).toEqual(['small', 'medium', 'large']);
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

  it('requires a size — there are no size-less variants', () => {
    const variants: VariantLike[] = [
      { id: 'a', material: 'brass', size: null, price_adjustment: 0, stock_quantity: 5, is_active: true },
    ];
    expect(findVariant(variants, 'brass', 'small')).toBeUndefined();
  });

  it('never returns inactive variants', () => {
    const variants = charmMatrix({ 'brass-small': { is_active: false } });
    expect(findVariant(variants, 'brass', 'small')).toBeUndefined();
  });
});

describe('lowestVariantPrice', () => {
  it('falls back to the base price when no variant is active', () => {
    expect(lowestVariantPrice({ base_price: 45 }, [])).toBe(45);
    expect(
      lowestVariantPrice({ base_price: 45 }, [
        { price_adjustment: 10, is_active: false },
      ]),
    ).toBe(45);
  });

  it('quotes the cheapest version, not the base price', () => {
    // Small discounted, large premium: the card must advertise 40.
    const variants = charmMatrix({
      'brass-small': { price_adjustment: -5 },
      'brass-large': { price_adjustment: 15 },
    });
    expect(lowestVariantPrice({ base_price: 45 }, variants)).toBe(40);
  });

  it('ignores inactive variants when hunting the lowest price', () => {
    const variants = charmMatrix({ 'brass-small': { price_adjustment: -20, is_active: false } });
    expect(lowestVariantPrice({ base_price: 45 }, variants)).toBe(45);
  });

  it('never returns a negative price', () => {
    const variants = charmMatrix({ 'brass-small': { price_adjustment: -500 } });
    expect(lowestVariantPrice({ base_price: 45 }, variants)).toBe(0);
  });
});

describe('pricing and labels', () => {
  it('adds the variant adjustment to the product base price', () => {
    const product = { base_price: 25 };
    const variants = charmMatrix();
    expect(variantPrice(product, findVariant(variants, 'brass', 'medium'))).toBe(25);
    expect(variantPrice(product, findVariant(variants, 'stainless_steel', 'medium'))).toBe(50);
    expect(variantPrice(product, null)).toBe(25);
  });

  it('supports a version priced below the base price', () => {
    const product = { base_price: 45 };
    const variants = charmMatrix({ 'brass-small': { price_adjustment: -5 } });
    expect(variantPrice(product, findVariant(variants, 'brass', 'small'))).toBe(40);
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
