import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const TARGETS = {
  ALWAYS_WITH_ME: '6496ab8c-8b58-4044-8a8a-25a38505479f',
  FOREVER_PAWPRINT: '9ed6dc37-9cb1-427e-8f9f-bea25471705e',
  HEARTBEAT: '47e84589-6e73-4dd6-b9ca-fe474a1cd751',
  MEMORIAL_BRACELET: '03a5a95f-c26e-4d52-a2aa-65d34acf2a9a',
  LOYAL_COMPANION: '55304cab-3623-485b-bfff-ea6645e1df02',
  UNBREAKABLE_BOND: 'e833503b-4d40-496a-aa1c-c62687bf4e4f',
};

const VARIANT_BY_PRODUCT = {
  [TARGETS.ALWAYS_WITH_ME]: { 'Sterling Silver': 18, '14K Gold': 9, 'Rose Gold': 6 },
  [TARGETS.FOREVER_PAWPRINT]: { 'Sterling Silver': 15, '14K Gold': 8, 'Rose Gold': 6 },
  [TARGETS.HEARTBEAT]: { 'Sterling Silver': 14, '14K Gold': 7, 'Rose Gold': 5 },
  [TARGETS.MEMORIAL_BRACELET]: { 'Sterling Silver': 0, '14K Gold': 3, 'Rose Gold': 2 },
  [TARGETS.LOYAL_COMPANION]: { 'Sterling Silver': 22, '14K Gold': 11, 'Rose Gold': 1 },
  [TARGETS.UNBREAKABLE_BOND]: { 'Sterling Silver': 12, '14K Gold': 0, 'Rose Gold': 5 },
};

const { data: variants, error } = await sb
  .from('product_variants')
  .select('id, product_id, name, stock_quantity');

if (error) {
  console.error('Failed to fetch variants:', error.message);
  process.exit(1);
}

const updates = [];
for (const v of variants ?? []) {
  const productStock = VARIANT_BY_PRODUCT[v.product_id];
  if (!productStock) continue;
  const newStock = productStock[v.name];
  if (newStock === undefined) continue;
  if (newStock !== v.stock_quantity) {
    updates.push({ id: v.id, product_id: v.product_id, name: v.name, from: v.stock_quantity, to: newStock });
  }
}

if (updates.length === 0) {
  console.log('All variant stock already matches targets.');
  process.exit(0);
}

console.log(`Updating ${updates.length} variant stock levels:`);
for (const u of updates) console.log(`  ${u.name} (${u.product_id.slice(0, 8)}): ${u.from} → ${u.to}`);

const BATCH = 20;
let ok = 0;
let fail = 0;
for (let i = 0; i < updates.length; i += BATCH) {
  const batch = updates.slice(i, i + BATCH);
  const results = await Promise.all(
    batch.map((u) => sb.from('product_variants').update({ stock_quantity: u.to }).eq('id', u.id)),
  );
  for (const r of results) {
    if (r.error) {
      fail += 1;
      console.error('  ERR:', r.error.message);
    } else ok += 1;
  }
}

console.log(`Done. ${ok} updated, ${fail} failed.`);
