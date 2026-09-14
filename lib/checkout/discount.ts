'use server';

import { createClient } from '@/lib/supabase/server';

export type DiscountResult = {
  valid: boolean;
  error?: string;
  code?: string;
  discount_type?: 'percentage' | 'fixed';
  discount_value?: number;
};

/**
 * Validate a discount code and return its details.
 * Called from both the checkout page (summary) and the checkout action (charge).
 */
export async function validateDiscountCode(code: string): Promise<DiscountResult> {
  if (!code.trim()) return { valid: false, error: 'Please enter a discount code.' };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('discounts')
    .select('code, discount_type, discount_value, min_order_amount, max_uses, current_uses, is_active, starts_at, expires_at')
    .ilike('code', code.trim())
    .single();

  if (error || !data) return { valid: false, error: 'That code is not valid.' };
  if (!data.is_active) return { valid: false, error: 'That code is no longer active.' };
  if (data.starts_at && new Date(data.starts_at) > new Date()) return { valid: false, error: 'That code is not active yet.' };
  if (data.expires_at && new Date(data.expires_at) < new Date()) return { valid: false, error: 'That code has expired.' };
  if (data.max_uses && data.current_uses >= data.max_uses) return { valid: false, error: 'That code has reached its usage limit.' };

  return {
    valid: true,
    code: data.code,
    discount_type: data.discount_type,
    discount_value: Number(data.discount_value),
  };
}
