import Link from 'next/link';
import { redirect } from 'next/navigation';
import Image from 'next/image';
import { getSession } from '@/components/admin/AdminGuard';
import { getWishlistItemsServer } from '@/lib/wishlist/server';
import { WishlistRemoveButton } from '@/components/account/WishlistRemoveButton';
import { images } from '@/lib/images';

export const metadata = {
  title: 'Wishlist — Loving Charmz',
};

export default async function WishlistPage() {
  const session = await getSession();
  if (!session) redirect('/login?next=/account/wishlist');

  const items = await getWishlistItemsServer();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-plum-900">My wishlist</h1>
        <p className="text-sm text-ink-600 mt-1">Pieces you have saved to revisit later.</p>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16 surface-card">
          <span className="badge-mint mb-3">Nothing saved yet</span>
          <h2 className="font-display text-xl text-plum-900 mt-2 mb-2">Your wishlist is empty</h2>
          <p className="text-ink-600 mb-6">Tap the heart on any piece to save it here.</p>
          <Link href="/shop" className="btn-plum px-6 py-2.5 text-sm">Browse the collection</Link>
        </div>
      ) : (
        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item, index) => {
            const product = (item as any).product;
            const image = product?.images?.[0] || images.shop[index % images.shop.length];
            return (
              <li key={item.id} className="surface-card overflow-hidden hover-lift">
                <Link
                  href={`/products/${product?.slug || ''}`}
                  className="block relative aspect-square overflow-hidden"
                >
                  <Image src={image} alt={product?.name || ''} fill className="object-cover motion-base" />
                </Link>
                <div className="p-5">
                  <h3 className="font-display text-lg font-semibold text-plum-900">
                    <Link href={`/products/${product?.slug || ''}`} className="hover:text-plum-700 motion-base">
                      {product?.name || 'Saved piece'}
                    </Link>
                  </h3>
                  {product?.base_price != null && (
                    <p className="mt-1 text-sm font-medium text-plum-700">
                      ${Number(product.base_price).toFixed(2)}
                    </p>
                  )}
                  <WishlistRemoveButton wishlistId={item.id} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
