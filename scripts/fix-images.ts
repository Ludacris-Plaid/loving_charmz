// Fix product & collection images — replace picsum.photos with reliable Unsplash URLs
import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const UNSPLASH_JEWELRY = [
  'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600&q=80',
  'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=600&q=80',
  'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=600&q=80',
  'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=600&q=80',
  'https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=600&q=80',
  'https://images.unsplash.com/photo-1589128777073-263566ae5e4d?w=600&q=80',
  'https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=600&q=80',
  'https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=600&q=80',
];

const UNSPLASH_COLLECTIONS = [
  'https://images.unsplash.com/photo-1589128777073-263566ae5e4d?w=1200&q=80',
  'https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=1200&q=80',
  'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=1200&q=80',
];

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) { console.error('Missing env'); process.exit(1); }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  // Fix products with picsum URLs
  const { data: products } = await supabase.from('products').select('id, name, images, slug');
  let fixed = 0;
  let idx = 0;
  for (const p of products || []) {
    const hasPicsum = (p.images || []).some((i: string) => i.includes('picsum'));
    if (!hasPicsum) continue;
    const newImages = [UNSPLASH_JEWELRY[idx % UNSPLASH_JEWELRY.length]];
    await supabase.from('products').update({ images: newImages }).eq('id', p.id);
    console.log(`  ✓ ${p.name} → fixed`);
    fixed++;
    idx++;
  }

  // Fix collections with picsum URLs + Bond Collection (no image)
  const { data: collections } = await supabase.from('collections').select('id, name, image_url, slug');
  let colFixed = 0;
  let cidx = 0;
  for (const c of collections || []) {
    if (!c.image_url || c.image_url.includes('picsum')) {
      const newUrl = UNSPLASH_COLLECTIONS[cidx % UNSPLASH_COLLECTIONS.length];
      await supabase.from('collections').update({ image_url: newUrl }).eq('id', c.id);
      console.log(`  ✓ ${c.name} → fixed`);
      colFixed++;
      cidx++;
    }
  }

  console.log(`\nDone. Fixed ${fixed} products, ${colFixed} collections.`);
}

main().catch(console.error);
