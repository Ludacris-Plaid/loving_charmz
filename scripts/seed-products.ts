// Loving Charmz — Product & Collection seeder
// Creates 3 new collections, 8 products with full descriptions,
// and 3 variants each (Sterling Silver, 14K Gold, Rose Gold).
// Idempotent: skips existing products by slug.
//
// Run with: npx tsx scripts/seed-products.ts
//
// Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in env.

import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const SEED_URL = 'https://images.unsplash.com';

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ── Collections ──────────────────────────────────────────────
  const collections = [
    {
      name: 'Ethereal Essentials',
      slug: 'ethereal-essentials',
      description:
        'Clean lines and quiet refinement — these everyday essentials are designed to move with you, from morning meetings to moonlit dinners.',
      image_url: `${SEED_URL}/photo-1589128777073-263566ae5e4d?w=1200&q=80`,
      sort_order: 10,
    },
    {
      name: 'Moonlit Garden',
      slug: 'moonlit-garden',
      description:
        'Wander through a garden kissed by moonlight — where twisted vines, unfurling leaves, and celestial curves bloom in precious metal.',
      image_url: `${SEED_URL}/photo-1573408301185-9146fe634ad0?w=1200&q=80`,
      sort_order: 20,
    },
    {
      name: 'Resonance',
      slug: 'resonance',
      description:
        'Architecture for the body — bold geometric forms, sharp angles, and sculptural volumes that command attention.',
      image_url: `${SEED_URL}/photo-1599643478518-a784e5dc4c8f?w=1200&q=80`,
      sort_order: 30,
    },
  ] as const;

  // ── Products grouped by collection ─────────────────────────
  interface ProductDef {
    name: string;
    slug: string;
    tagline: string;
    description: string;
    base_price: number;
    is_personalizable: boolean;
    images: string[];
  }

  type CollectionSlug = (typeof collections)[number]['slug'];

  const productGroups: Record<CollectionSlug, ProductDef[]> = {
    'ethereal-essentials': [
      {
        name: 'Lumina Cuff',
        slug: 'lumina-cuff',
        tagline: 'A whisper of light on your wrist',
        description:
          'The Lumina Cuff is a study in restraint — a slim, open-ended bracelet hand-finished to a soft brushed satin. Its gentle taper and weightless feel make it the perfect permanent companion, worn alone or stacked with treasured pieces. Each cuff is shaped and polished by hand, with edges so smooth you will forget it is there.',
        base_price: 185,
        is_personalizable: false,
        images: [
          `${SEED_URL}/photo-1599643478518-a784e5dc4c8f?w=600&q=80`,
        ],
      },
      {
        name: 'Drift Drop Earrings',
        slug: 'drift-drop-earrings',
        tagline: 'Fluid forms inspired by water',
        description:
          'Inspired by the moment a drop of water releases from a leaf, the Drift Drop Earrings capture movement frozen in metal. The asymmetrical teardrop forms catch and scatter light with every turn of the head, creating a liquid shimmer. Hand-fabricated in a high-polish finish with French ear wires.',
        base_price: 220,
        is_personalizable: false,
        images: [
          `${SEED_URL}/photo-1605100804763-247f67b3557e?w=600&q=80`,
        ],
      },
      {
        name: 'Solstice Pendant',
        slug: 'solstice-pendant',
        tagline: 'The sun, captured at golden hour',
        description:
          'A miniature sunburst rendered in metal — the Solstice Pendant features radiating rays emanating from a polished center disc. Suspended from a delicate 16-inch chain, it rests at the collarbone like a warm glow. The reverse side is subtly textured to catch light differently throughout the day.',
        base_price: 165,
        is_personalizable: true,
        images: [
          `${SEED_URL}/photo-1611591437281-460bfbe1220a?w=600&q=80`,
        ],
      },
    ],
    'moonlit-garden': [
      {
        name: 'Thornvine Ring',
        slug: 'thornvine-ring',
        tagline: 'A romance with the wild',
        description:
          'The Thornvine Ring wraps the finger in a tangle of sculpted briar, with finely wrought thorns and leaves catching at the edges. Despite its fierce inspiration, the ring sits comfortably — each thorn is rounded for wearability while retaining its sculptural edge. A piece for those who find beauty in the untamed.',
        base_price: 275,
        is_personalizable: false,
        images: [
          `${SEED_URL}/photo-1515562141207-7a88fb7ce338?w=600&q=80`,
        ],
      },
      {
        name: 'Nocturne Leaf Ear Climbers',
        slug: 'nocturne-leaf-earrings',
        tagline: 'Vines climbing toward the stars',
        description:
          'These ear climbers trace the curve of the ear with a single elongated leaf, textured with delicate veining and tipped with a tiny polished bud. They appear to grow naturally from the earlobe, creating an organic silhouette that shifts with your hair and movement. Each pair is hand-sculpted so no two are exactly alike.',
        base_price: 245,
        is_personalizable: false,
        images: [
          `${SEED_URL}/photo-1611652022419-a9419f74343d?w=600&q=80`,
        ],
      },
      {
        name: 'Crescent Locket',
        slug: 'crescent-locket',
        tagline: 'Carry the night sky close',
        description:
          'A hinged crescent moon that opens to reveal a hidden compartment — large enough for a photo, a dried flower, or a whispered secret. The front face is engraved with a scattering of tiny stars, while the reverse is left smooth for a personal inscription. Suspended from an 18-inch chain with a delicate lobster clasp.',
        base_price: 310,
        is_personalizable: true,
        images: [
          `${SEED_URL}/photo-1589128777073-263566ae5e4d?w=600&q=80`,
        ],
      },
    ],
    resonance: [
      {
        name: 'Prism Collar',
        slug: 'prism-collar',
        tagline: 'Geometry worn at the throat',
        description:
          'The Prism Collar is a study in geometric tension — interlocking triangular links form a rigid yet flexible collar that sits away from the neck. Each facet is hand-soldered and polished to a mirror finish, creating a lattice of light and shadow. Fastens with a hidden magnetic clasp at the back.',
        base_price: 420,
        is_personalizable: false,
        images: [
          `${SEED_URL}/photo-1573408301185-9146fe634ad0?w=600&q=80`,
        ],
      },
      {
        name: 'Apex Cuff',
        slug: 'apex-cuff',
        tagline: 'A sculptural statement for the wrist',
        description:
          'The Apex Cuff is a wide, sculptural bangle with sharply angled planes that rise and fall like a mountain ridge. Its asymmetric profile creates an ever-changing play of highlight and shadow as the wrist moves. The interior is slightly curved for a comfortable fit, while the exterior is hand-polished to a luminous sheen.',
        base_price: 380,
        is_personalizable: false,
        images: [
          `${SEED_URL}/photo-1599643477877-530eb83abc8e?w=600&q=80`,
        ],
      },
    ],
  };

  const variantDefs = [
    { name: 'Sterling Silver', skuSuffix: 'SS', priceAdj: 0, stock: 25 },
    { name: '14K Gold', skuSuffix: '14K', priceAdj: 120, stock: 15 },
    { name: 'Rose Gold', skuSuffix: 'RG', priceAdj: 100, stock: 12 },
  ];

  // ── Seed ──────────────────────────────────────────────────────
  console.log('Checking existing data…');
  const { data: existingProducts } = await supabase.from('products').select('slug, id');
  const { data: existingCollections } = await supabase.from('collections').select('slug, id');
  const { data: existingVariants } = await supabase.from('product_variants').select('product_id, name');

  const existingSlugs = new Set(existingProducts?.map((p) => p.slug) ?? []);
  const existingColSlugs = new Set(existingCollections?.map((c) => c.slug) ?? []);
  const existingVariantKey = new Set(
    existingVariants?.map((v) => `${v.product_id}:${v.name}`) ?? [],
  );

  // ── Upsert collections ──────────────────────────────────────
  console.log('\nUpserting collections…');
  const collectionIds: Record<string, string> = {};

  for (const col of collections) {
    if (existingColSlugs.has(col.slug)) {
      const existing = existingCollections!.find((c) => c.slug === col.slug)!;
      console.log(`  ↻ "${col.name}" exists (${existing.id.slice(0, 8)}), updating…`);
      await supabase
        .from('collections')
        .update({
          name: col.name,
          description: col.description,
          image_url: col.image_url,
          sort_order: col.sort_order,
        })
        .eq('id', existing.id);
      collectionIds[col.slug] = existing.id;
    } else {
      const { data, error } = await supabase
        .from('collections')
        .insert({
          name: col.name,
          slug: col.slug,
          description: col.description,
          image_url: col.image_url,
          sort_order: col.sort_order,
          is_active: true,
        })
        .select('id')
        .single();
      if (error) {
        console.error(`  ✗ Failed to create "${col.name}": ${error.message}`);
        continue;
      }
      console.log(`  ✓ Created "${col.name}" (${data.id.slice(0, 8)})`);
      collectionIds[col.slug] = data.id;
    }
  }

  // ── Upsert products + variants ──────────────────────────────
  console.log('\nUpserting products…');
  const productIds: Record<string, string> = {};
  let totalVariants = 0;

  for (const colSlug of Object.keys(productGroups) as CollectionSlug[]) {
    const colId = collectionIds[colSlug];
    if (!colId) {
      console.warn(`  ⚠ Skipping products for "${colSlug}" — collection missing`);
      continue;
    }

    const products = productGroups[colSlug];
    for (const prod of products) {
      let productId: string;

      if (existingSlugs.has(prod.slug)) {
        const existing = existingProducts!.find((p) => p.slug === prod.slug)!;
        console.log(`  ↻ "${prod.name}" exists (${existing.id.slice(0, 8)}), updating…`);
        await supabase
          .from('products')
          .update({
            name: prod.name,
            tagline: prod.tagline,
            description: prod.description,
            base_price: prod.base_price,
            images: prod.images,
            is_personalizable: prod.is_personalizable,
            is_active: true,
          })
          .eq('id', existing.id);
        productId = existing.id;
      } else {
        const { data, error } = await supabase
          .from('products')
          .insert({
            name: prod.name,
            slug: prod.slug,
            tagline: prod.tagline,
            description: prod.description,
            base_price: prod.base_price,
            images: prod.images,
            is_active: true,
            is_personalizable: prod.is_personalizable,
          })
          .select('id')
          .single();
        if (error) {
          console.error(`  ✗ Failed to create "${prod.name}": ${error.message}`);
          continue;
        }
        console.log(`  ✓ Created "${prod.name}" (${data.id.slice(0, 8)})`);
        productId = data.id;
      }

      productIds[prod.slug] = productId;

      // Link to collection (if not already linked)
      const { data: existingLink } = await supabase
        .from('collection_products')
        .select('collection_id')
        .eq('collection_id', colId)
        .eq('product_id', productId)
        .maybeSingle();

      if (!existingLink) {
        await supabase.from('collection_products').insert({
          collection_id: colId,
          product_id: productId,
          sort_order: 0,
        });
        console.log(`    → Linked to "${colSlug}"`);
      }

      // Variants
      for (const v of variantDefs) {
        const vKey = `${productId}:${v.name}`;
        if (existingVariantKey.has(vKey)) {
          console.log(`    ↻ Variant "${v.name}" exists, updating stock…`);
          await supabase
            .from('product_variants')
            .update({ stock_quantity: v.stock, price_adjustment: v.priceAdj, is_active: true })
            .eq('product_id', productId)
            .eq('name', v.name);
        } else {
          const { error } = await supabase.from('product_variants').insert({
            product_id: productId,
            name: v.name,
            sku: `${prod.slug.toUpperCase().replace(/-/g, '_')}_${v.skuSuffix}`,
            price_adjustment: v.priceAdj,
            stock_quantity: v.stock,
            is_active: true,
          });
          if (error) {
            console.error(`    ✗ Failed to create variant "${v.name}": ${error.message}`);
          } else {
            console.log(`    ✓ Variant "${v.name}" (${v.stock} stock)`);
            totalVariants += 1;
          }
        }
      }
    }
  }

  console.log(
    `\nDone. ${Object.keys(productIds).length} products, ${totalVariants} new variants across ${Object.keys(collectionIds).length} collections.`,
  );
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
