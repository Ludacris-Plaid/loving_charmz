'use client';

import { useState, useRef, useEffect, useTransition } from 'react';
import { updateOrderStatusAction, updatePaymentStatusAction } from '@/lib/admin/analytics/actions';
import type { OrderStatus, PaymentStatus } from '@/lib/admin/analytics/types';

const ORDER_STATUSES: OrderStatus[] = ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
const PAYMENT_STATUSES: PaymentStatus[] = ['pending', 'paid', 'failed', 'refunded'];

type InlineOrderStatusMenuProps = {
  orderId: string;
  currentStatus: string;
  type?: 'order' | 'payment';
};

export function InlineOrderStatusMenu({ orderId, currentStatus, type = 'order' }: InlineOrderStatusMenuProps) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [optimisticStatus, setOptimisticStatus] = useState(currentStatus);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const options = type === 'order' ? ORDER_STATUSES : PAYMENT_STATUSES;

  function handleSelect(next: string) {
    setOpen(false);
    setOptimisticStatus(next);
    startTransition(async () => {
      const action = type === 'order' ? updateOrderStatusAction : updatePaymentStatusAction;
      const res = await action(orderId, next);
      if (!res.ok) setOptimisticStatus(currentStatus);
    });
  }

  return (
    <div ref={ref} className="analytics-control-group" style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        className="analytics-inline-status"
        data-status={optimisticStatus}
        onClick={() => setOpen((o) => !o)}
        disabled={pending}
      >
        {optimisticStatus}
        <span aria-hidden style={{ fontSize: '0.6rem' }}>▾</span>
      </button>
      {open && (
        <div className="analytics-popover">
          {options.map((s) => (
            <button
              key={s}
              type="button"
              className="analytics-popover-item"
              onClick={() => handleSelect(s)}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
