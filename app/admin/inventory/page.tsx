import { getInventoryRows } from '@/lib/admin/data';
import { getAdminProducts } from '@/lib/admin/products';
import { AdminInventoryClient } from '@/components/admin/AdminInventoryClient';

export const metadata = {
  title: 'Admin · Inventory — Loving Charmz',
};

export const dynamic = 'force-dynamic';

type VariantRow = {
  id: string;
  name: string;
  sku: string | null;
  stock_quantity: number;
  price_adjustment: number;
  is_active: boolean;
  material: string | null;
  size: string | null;
  product_id: string;
  product_name: string;
  product_slug: string;
  product_kind: string;
  product_base_price: number;
};

export default async function AdminInventoryPage() {
  const [rows, products] = await Promise.all([
    getInventoryRows(),
    getAdminProducts(),
  ]);

  // Group variants by product so charms render a material×size matrix while
  // jewelry renders simple material rows.
  const byProduct = new Map<string, VariantRow[]>();
  for (const raw of rows as unknown as VariantRow[]) {
    const list = byProduct.get(raw.product_id) || [];
    list.push(raw);
    byProduct.set(raw.product_id, list);
  }

  const productCards = [...byProduct.entries()].map(([productId, variants]) => ({
    productId,
    productName: variants[0].product_name,
    productSlug: variants[0].product_slug,
    productBasePrice: Number(variants[0].product_base_price || 0),
    kind: variants[0].product_kind,
    variants: variants.map((v) => ({
      id: v.id,
      material: v.material,
      size: v.size,
      name: v.name,
      sku: v.sku,
      stock_quantity: Number(v.stock_quantity),
      price_adjustment: Number(v.price_adjustment) || 0,
      is_active: Boolean(v.is_active),
    })),
  }));

  // Products with no variants at all still need a way into the editor.
  const variantless = (products as any[])
    .filter((p) => !byProduct.has(p.id))
    .map((p) => ({
      productId: p.id as string,
      productName: p.name as string,
      productSlug: p.slug as string,
      productBasePrice: Number(p.base_price || 0),
      kind: (p.kind as string) || 'charm',
      variants: [],
    }));

  return (
    <div className="space-y-6">
      <div>
        <span className="badge-plum">Inventory</span>
        <h1 className="font-display text-3xl font-semibold text-plum-900 mt-3">Stock &amp; variants</h1>
        <p className="text-sm text-ink-600 mt-1">
          Every piece tracks stock and price per material (brass / stainless steel) and size (S / M / L). Type your counts, then press Save — one save per product.
        </p>
      </div>
      <AdminInventoryClient productCards={[...productCards, ...variantless]} />
    </div>
  );
}
