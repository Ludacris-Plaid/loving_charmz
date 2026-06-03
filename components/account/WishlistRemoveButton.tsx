'use client';

import { useState, useTransition } from 'react';
import { removeWishlistItemAction } from '@/lib/wishlist/actions';

type Props = {
  wishlistId: string;
};

export function WishlistRemoveButton({ wishlistId }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleRemove = () => {
    setError(null);
    startTransition(async () => {
      const res = await removeWishlistItemAction(wishlistId);
      if (res.error) setError(res.error);
    });
  };

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={handleRemove}
        disabled={pending}
        className="text-xs font-medium uppercase tracking-wider text-ink-500 hover:text-plum-700 motion-base"
      >
        {pending ? 'Removing…' : 'Remove'}
      </button>
      {error && <p className="text-xs text-red-600 mt-1" role="alert">{error}</p>}
    </div>
  );
}
