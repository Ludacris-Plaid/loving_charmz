'use client';

import { useState, useTransition } from 'react';
import { saveVariantMatrixAction } from '@/lib/admin/collections-and-variants';
import { updateVariantStockAction } from '@/lib/admin/actions';
import {
  CHARM_MATERIALS,
  CHARM_SIZES,
  JEWELRY_MATERIALS,
  MATERIAL_LABELS,
  SIZE_LABELS,
  variantDisplayName,
} from '@/lib/shop/variants';

export type VariantCell = {
  id?: string;
  material: string | null;
  size: string | null;
  name: string;
  sku: string | null;
  stock_quantity: number;
  price_adjustment: number;
  is_active: boolean;
};

export type ProductCard = {
  productId: string;
  productName: string;
  productSlug: string;
  kind: string;
  variants: VariantCell[];
};

type CardProps = {
  card: ProductCard;
  onSaved: () => void;
  onError: (msg: string | null) => void;
};

export function AdminInventoryClient({
  productCards,
}: {
  productCards: ProductCard[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const flash = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 2500);
  };

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
      {success && <p className="text-sm text-plum-700" role="status">{success}</p>}

      {productCards.length === 0 ? (
        <div className="text-center py-12 surface-card text-sm text-ink-500">
          No products yet. Create products first, then manage their inventory here.
        </div>
      ) : (
        productCards.map((card) =>
          card.kind === 'charm' ? (
            <CharmMatrixCard
              key={card.productId}
              card={card}
              onSaved={() => flash(`${card.productName} saved.`)}
              onError={setError}
            />
          ) : (
            <JewelryCard
              key={card.productId}
              card={card}
              onSaved={() => flash(`${card.productName} saved.`)}
              onError={setError}
            />
          ),
        )
      )}
    </div>
  );
}

/** Charm products: an editable 2-material × 3-size matrix, saved per product. */
function CharmMatrixCard({ card, onSaved, onError }: CardProps) {
  const [, startTransition] = useTransition();

  // Local editable state, seeded from the server rows. Missing matrix cells
  // are synthesized as zero-stock rows so charms always show all 6 combos.
  const [rows, setRows] = useState<VariantCell[]>(() => {
    const have = new Map(
      card.variants.map((v) => [`${v.material}|${v.size}`, v] as const),
    );
    return CHARM_MATERIALS.flatMap((m) =>
      CHARM_SIZES.map((s) => {
        const found = have.get(`${m}|${s}`);
        return (
          found || {
            material: m as string,
            size: s as string,
            name: variantDisplayName(m, s),
            sku: null,
            stock_quantity: 0,
            price_adjustment: m === 'stainless_steel' ? 25 : 0,
            is_active: true,
          }
        );
      }),
    );
  });

  const setCell = (index: number, patch: Partial<VariantCell>) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const save = () => {
    onError(null);
    startTransition(async () => {
      const res = await saveVariantMatrixAction(
        card.productId,
        rows.map((r) => ({
          material: r.material as string,
          size: r.size,
          stock_quantity: Number(r.stock_quantity) || 0,
          price_adjustment: Number(r.price_adjustment) || 0,
          is_active: r.is_active,
        })),
      );
      if (res.error) onError(res.error);
      else onSaved();
    });
  };

  const totalStock = rows.reduce(
    (sum, r) => sum + (r.is_active ? Number(r.stock_quantity) || 0 : 0),
    0,
  );

  return (
    <div className="surface-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="font-display text-lg font-semibold text-plum-900">{card.productName}</h2>
          <p className="text-xs text-ink-500">
            Charm — stock tracked per material and size · /{card.productSlug} · {totalStock} in stock
          </p>
        </div>
        <button type="button" onClick={save} className="btn-plum px-5 py-2 text-xs">
          Save {card.productName}
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-cream-100 text-left text-xs uppercase tracking-wider text-ink-500">
              <th className="px-3 py-2">Material</th>
              <th className="px-3 py-2">Size</th>
              <th className="px-3 py-2">SKU</th>
              <th className="px-3 py-2 w-24">Stock</th>
              <th className="px-3 py-2 w-28">Price +$</th>
              <th className="px-3 py-2">Active</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={`${r.material}-${r.size}`} className="border-t border-cream-200 text-sm">
                <td className="px-3 py-2 font-medium text-ink-800">
                  {MATERIAL_LABELS[r.material as string] || r.material}
                </td>
                <td className="px-3 py-2 text-ink-700">
                  {r.size ? SIZE_LABELS[r.size] || r.size : '—'}
                </td>
                <td className="px-3 py-2 text-xs font-mono text-ink-500">{r.sku || 'auto'}</td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min="0"
                    value={r.stock_quantity}
                    onChange={(e) => setCell(i, { stock_quantity: Number(e.target.value) })}
                    className="input-base w-20 py-1.5 text-sm"
                    aria-label={`${r.name} stock`}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={r.price_adjustment}
                    onChange={(e) => setCell(i, { price_adjustment: Number(e.target.value) })}
                    className="input-base w-20 py-1.5 text-sm"
                    aria-label={`${r.name} price adjustment`}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={r.is_active}
                    onChange={(e) => setCell(i, { is_active: e.target.checked })}
                    className="h-4 w-4 accent-plum-700"
                    aria-label={`${r.name} active`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Jewelry products: material-only rows with inline stock editing. */
function JewelryCard({ card, onSaved, onError }: CardProps) {
  const [stock, setStock] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      card.variants.map((v) => [v.id as string, v.stock_quantity]),
    ),
  );
  const [savingId, setSavingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Missing jewelry materials (e.g. a charm product not yet switched) surface
  // as an explicit "not set up" row instead of silently disappearing.
  const missing = JEWELRY_MATERIALS.filter(
    (m) => !card.variants.some((v) => v.material === m),
  );

  const handleStock = (id: string, value: number) => {
    setStock((prev) => ({ ...prev, [id]: value }));
    setSavingId(id);
    startTransition(async () => {
      const res = await updateVariantStockAction(id, value);
      setSavingId(null);
      if (res.error) onError(res.error);
      else onSaved();
    });
  };

  return (
    <div className="surface-card p-5">
      <div className="mb-4">
        <h2 className="font-display text-lg font-semibold text-plum-900">{card.productName}</h2>
        <p className="text-xs text-ink-500">
          Jewelry — stock tracked per material · /{card.productSlug}
        </p>
      </div>
      <table className="w-full">
        <thead>
          <tr className="bg-cream-100 text-left text-xs uppercase tracking-wider text-ink-500">
            <th className="px-3 py-2">Material</th>
            <th className="px-3 py-2">SKU</th>
            <th className="px-3 py-2 w-28">Stock</th>
            <th className="px-3 py-2">Active</th>
          </tr>
        </thead>
        <tbody>
          {card.variants.map((v) => (
            <tr key={v.id} className="border-t border-cream-200 text-sm">
              <td className="px-3 py-2 font-medium text-ink-800">
                {MATERIAL_LABELS[v.material as string] || v.name}
              </td>
              <td className="px-3 py-2 text-xs font-mono text-ink-500">{v.sku || '—'}</td>
              <td className="px-3 py-2">
                <input
                  type="number"
                  min="0"
                  value={stock[v.id as string] ?? v.stock_quantity}
                  onChange={(e) => handleStock(v.id as string, Number(e.target.value))}
                  disabled={savingId === v.id}
                  className="input-base w-24 py-1.5 text-sm"
                  aria-label={`${v.name} stock`}
                />
              </td>
              <td className="px-3 py-2">
                {v.is_active ? <span className="badge-mint">Yes</span> : <span className="badge-soft">No</span>}
              </td>
            </tr>
          ))}
          {missing.map((m) => (
            <tr key={m} className="border-t border-cream-200 text-sm text-ink-500">
              <td className="px-3 py-2">{MATERIAL_LABELS[m]}</td>
              <td className="px-3 py-2 text-xs">—</td>
              <td className="px-3 py-2 text-xs">not set up</td>
              <td className="px-3 py-2 text-xs">edit the product to add</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
