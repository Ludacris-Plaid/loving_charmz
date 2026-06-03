'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type PersonalizationResult = { error?: string; success?: boolean; id?: string };

function asString(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value.trim() : '';
}

function asStringArray(value: FormDataEntryValue | null) {
  if (!value) return [];
  return String(value)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function createPersonalizationRequestAction(formData: FormData): Promise<PersonalizationResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Please sign in to start a custom order.' };

  const product_id = asString(formData.get('product_id')) || null;
  const pet_name = asString(formData.get('pet_name')) || null;
  const freeform_text = asString(formData.get('freeform_text')) || null;
  const reference_image_url = asString(formData.get('reference_image_url')) || null;
  const charm_selections = asStringArray(formData.get('charm_selections'));

  if (!freeform_text && !pet_name) {
    return { error: 'Please tell us about your keepsake — at least a pet name or a description.' };
  }

  const { data, error } = await supabase
    .from('personalization_requests')
    .insert({
      user_id: user.id,
      product_id: product_id || null,
      pet_name,
      freeform_text,
      reference_image_url,
      charm_selections: charm_selections.length ? charm_selections : null,
      status: 'pending',
    })
    .select('id')
    .single();

  if (error) return { error: error.message };

  revalidatePath('/account/custom-orders');
  revalidatePath('/admin/personalization');
  return { success: true, id: data.id };
}
