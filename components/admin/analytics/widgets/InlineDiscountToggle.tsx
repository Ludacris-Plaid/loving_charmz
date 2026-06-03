'use client';

import { useState, useTransition } from 'react';
import { toggleDiscountAction } from '@/lib/admin/analytics/actions';

type InlineDiscountToggleProps = {
  discountId: string;
  isActive: boolean;
};

export function InlineDiscountToggle({ discountId, isActive }: InlineDiscountToggleProps) {
  const [active, setActive] = useState(isActive);
  const [pending, startTransition] = useTransition();

  function handleToggle() {
    const next = !active;
    setActive(next);
    startTransition(async () => {
      const res = await toggleDiscountAction(discountId, next);
      if (!res.ok) setActive(isActive);
    });
  }

  return (
    <button
      type="button"
      className="analytics-inline-status"
      data-status={active ? 'delivered' : 'cancelled'}
      onClick={handleToggle}
      disabled={pending}
      aria-pressed={active}
    >
      {active ? 'Active' : 'Inactive'}
      <span aria-hidden style={{ fontSize: '0.6rem' }}>{active ? '✓' : '○'}</span>
    </button>
  );
}
