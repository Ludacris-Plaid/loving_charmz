// Loving Charmz — Analytics demo data seeder
// Inserts ~120 orders, 12 customers, 30 order_items, 10 wishlist items,
// 6 personalization requests, 3 discounts, 30 payment transactions.
// Idempotent: deletes any rows previously created by this script first.
//
// Run with: npx tsx scripts/seed-analytics.ts
//
// Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in env.

import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const SEED_TAG = 'analytics-seed';

async function tableExists(name: string): Promise<boolean> {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
  const { error } = await sb.from(name).select('id', { head: true, count: 'exact' }).limit(0);
  return !error;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n && copy.length; i++) {
    out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
  }
  return out;
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min: number, max: number, decimals = 2): number {
  return Number((Math.random() * (max - min) + min).toFixed(decimals));
}

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

  console.log('Reading existing data…');
  const [
    { data: products },
    { data: collections },
    { data: existingProfiles },
    { data: existingVariants },
  ] = await Promise.all([
    supabase.from('products').select('*'),
    supabase.from('collections').select('*'),
    supabase.from('profiles').select('*'),
    supabase.from('product_variants').select('*'),
  ]);

  if (!products || products.length === 0) {
    console.error('No products found. Run the product seed first.');
    process.exit(1);
  }
  if (!existingVariants || existingVariants.length === 0) {
    console.error('No product_variants found. Add variants before running analytics seed.');
    process.exit(1);
  }

  console.log('Cleaning prior seed (if any)…');
  await supabase.from('order_items').delete().like('product_name', `${SEED_TAG}%`);
  await supabase.from('orders').delete().eq('payment_status', 'paid').eq('status', 'delivered').gte('subtotal', 0);
  const { data: seedOrders } = await supabase
    .from('orders')
    .select('id')
    .eq('metadata->>seed_tag', SEED_TAG);
  if (seedOrders && seedOrders.length) {
    const ids = seedOrders.map((o) => o.id);
    await supabase.from('order_items').delete().in('order_id', ids);
    await supabase.from('orders').delete().in('id', ids);
  }
  await supabase.from('wishlists').delete().eq('metadata->>seed_tag', SEED_TAG);
  await supabase.from('personalization_requests').delete().eq('admin_notes', SEED_TAG);
  await supabase.from('discounts').delete().like('code', 'SEED-%');
  if (await tableExists('analytics_annotations')) {
    await supabase.from('analytics_annotations').delete().like('title', 'Seed:%');
  }
  const { data: seedProfiles } = await supabase
    .from('profiles')
    .select('id')
    .eq('bio', SEED_TAG);
  if (seedProfiles && seedProfiles.length) {
    const seedEmails = seedProfiles.map((p) => p.id);
    for (const id of seedEmails) {
      await supabase.auth.admin.deleteUser(id).catch(() => null);
    }
  }
  await supabase.from('profiles').delete().eq('bio', SEED_TAG);

  console.log('Creating seed customers…');
  const firstNames = ['Aria', 'Bella', 'Cleo', 'Dahlia', 'Elena', 'Fiona', 'Gemma', 'Hazel', 'Ivy', 'Juno', 'Kira', 'Luna'];
  const lastNames = ['Hayes', 'Mercer', 'Quinn', 'Reed', 'Sloan', 'Vance', 'Wells', 'Avery', 'Brooks', 'Crane', 'Donovan', 'Ellis'];
  const seedUserIds: string[] = [];

  for (let i = 0; i < 12; i++) {
    const first = firstNames[i % firstNames.length];
    const last = lastNames[i % lastNames.length];
    const email = `seed-${first.toLowerCase()}.${last.toLowerCase()}@lovingcharmz.test`;
    const username = `seed_${first.toLowerCase()}_${i}`;
    const created = daysAgo(randInt(10, 180));

    const { data: user, error: userErr } = await supabase.auth.admin.createUser({
      email,
      password: '!Analytics2026',
      email_confirm: true,
      user_metadata: { username, display_name: `${first} ${last}` },
    });
    if (userErr || !user?.user) {
      console.error(`Failed to create user ${email}:`, userErr?.message);
      continue;
    }
    seedUserIds.push(user.user.id);

    await supabase
      .from('profiles')
      .update({
        display_name: `${first} ${last}`,
        bio: SEED_TAG,
        pet_story: `A pet-bond story shared by ${first}.`,
        is_public: Math.random() > 0.3,
      })
      .eq('id', user.user.id);
  }

  console.log('Creating seed orders…');
  const statuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
  const paymentMethods = ['card', 'paypal', 'apple_pay', 'google_pay'];
  const paymentStatuses = ['paid', 'paid', 'paid', 'paid', 'pending', 'failed', 'refunded'];

  const orderIds: string[] = [];

  for (let i = 0; i < 120; i++) {
    const userId = Math.random() < 0.85 ? pick(seedUserIds) : null;
    const itemCount = randInt(1, 3);
    const picked = pickN(existingVariants, itemCount);
    const lineItems = picked.map((v) => {
      const product = products.find((p) => p.id === v.product_id);
      const unitPrice = Number(product?.base_price || 0) + Number(v.price_adjustment || 0);
      const quantity = randInt(1, 2);
      return {
        product_id: v.product_id,
        variant_id: v.id,
        product_name: `${SEED_TAG} ${product?.name || 'Item'}`,
        variant_name: v.name,
        unit_price: unitPrice,
        quantity,
      };
    });

    const subtotal = lineItems.reduce((s, l) => s + l.unit_price * l.quantity, 0);
    const discount = Math.random() < 0.25 ? randFloat(5, 25) : 0;
    const shipping = subtotal > 100 ? 0 : randFloat(6, 12);
    const tax = subtotal * 0.08;
    const total = Math.max(0, subtotal + shipping + tax - discount);
    const status = pick(statuses);
    const paymentStatus = pick(paymentStatuses);
    const age = randInt(0, 180);
    const createdAt = daysAgo(age);
    const updatedAt = daysAgo(Math.max(0, age - randInt(0, 5)));

    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert({
        user_id: userId,
        status,
        subtotal,
        shipping_cost: shipping,
        tax,
        discount,
        total,
        shipping_address: {
          name: 'Seed Customer',
          line1: '123 Test Lane',
          city: 'Portland',
          region: 'OR',
          postal_code: '97201',
          country: 'US',
        },
        payment_method: pick(paymentMethods),
        payment_status: paymentStatus,
        metadata: { seed_tag: SEED_TAG, index: i },
        created_at: createdAt,
        updated_at: updatedAt,
      })
      .select('id')
      .single();

    if (orderErr || !order) {
      console.error(`Failed to insert order #${i}:`, orderErr?.message);
      continue;
    }
    orderIds.push(order.id);

    for (const li of lineItems) {
      await supabase.from('order_items').insert({
        order_id: order.id,
        product_id: li.product_id,
        variant_id: li.variant_id,
        product_name: li.product_name,
        variant_name: li.variant_name,
        unit_price: li.unit_price,
        quantity: li.quantity,
      });
    }

    if (paymentStatus === 'paid' || paymentStatus === 'refunded') {
      await supabase.from('payment_transactions').insert({
        order_id: order.id,
        provider: 'stripe',
        provider_transaction_id: `seed_tx_${i}_${Math.random().toString(36).slice(2, 10)}`,
        amount: total,
        currency: 'USD',
        status: paymentStatus === 'paid' ? 'succeeded' : 'refunded',
        provider_data: { seed: true },
        created_at: createdAt,
      });
    }
  }

  console.log('Creating wishlist items…');
  const wishlistPairs = new Set<string>();
  let wishlistInserted = 0;
  let wishlistAttempts = 0;
  while (wishlistInserted < 10 && wishlistAttempts < 50) {
    wishlistAttempts += 1;
    const userId = pick(seedUserIds);
    const product = pick(products);
    const key = `${userId}:${product.id}`;
    if (wishlistPairs.has(key)) continue;
    wishlistPairs.add(key);
    const { error } = await supabase.from('wishlists').insert({
      user_id: userId,
      product_id: product.id,
      created_at: daysAgo(randInt(0, 90)),
      metadata: { seed_tag: SEED_TAG },
    });
    if (error) {
      console.warn(`  wishlist insert failed (${userId.slice(0, 8)} × ${product.id.slice(0, 8)}): ${error.message}`);
    } else {
      wishlistInserted += 1;
    }
  }

  console.log('Creating personalization requests…');
  const personalizationStatuses = ['pending', 'in_review', 'approved', 'in_production', 'completed', 'cancelled'];
  for (let i = 0; i < 6; i++) {
    const userId = pick(seedUserIds);
    const product = pick(products);
    await supabase.from('personalization_requests').insert({
      user_id: userId,
      product_id: product.id,
      pet_name: pick(['Luna', 'Max', 'Biscuit', 'Coco', 'Buddy', 'Daisy']),
      charm_selections: pickN(['Heart', 'Paw', 'Star', 'Moon', 'Anchor', 'Cross'], randInt(1, 3)),
      freeform_text: 'A personal keepsake to honor my companion.',
      status: pick(personalizationStatuses),
      admin_notes: SEED_TAG,
      created_at: daysAgo(randInt(0, 60)),
    });
  }

  console.log('Creating discounts…');
  const now = new Date();
  const inFuture = (days: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    return d.toISOString();
  };
  const inPast = (days: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() - days);
    return d.toISOString();
  };
  await supabase.from('discounts').insert([
    {
      code: 'SEED-WELCOME10',
      discount_type: 'percentage',
      discount_value: 10,
      min_order_amount: 50,
      max_uses: 100,
      current_uses: randInt(5, 30),
      starts_at: inPast(30),
      expires_at: inFuture(60),
      is_active: true,
    },
    {
      code: 'SEED-SUMMER25',
      discount_type: 'percentage',
      discount_value: 25,
      min_order_amount: 100,
      max_uses: 50,
      current_uses: randInt(0, 10),
      starts_at: inPast(3),
      expires_at: inFuture(13),
      is_active: true,
    },
    {
      code: 'SEED-FLAT15',
      discount_type: 'fixed',
      discount_value: 15,
      min_order_amount: 75,
      max_uses: 200,
      current_uses: randInt(10, 60),
      starts_at: inPast(60),
      expires_at: inPast(5),
      is_active: false,
    },
  ]);

  console.log('Creating chart annotations…');
  if (await tableExists('analytics_annotations')) {
    await supabase.from('analytics_annotations').insert([
      {
        annotation_date: new Date(Date.now() - 75 * 86400000).toISOString().slice(0, 10),
        title: 'Seed: Spring collection launch',
        body: 'Bond Collection v2 — early access sent to newsletter.',
        color: 'plum',
      },
      {
        annotation_date: new Date(Date.now() - 40 * 86400000).toISOString().slice(0, 10),
        title: 'Seed: WELCOME10 promo started',
        body: 'Onboarding discount for new sign-ups.',
        color: 'mint',
      },
      {
        annotation_date: new Date(Date.now() - 12 * 86400000).toISOString().slice(0, 10),
        title: 'Seed: SUMMER25 launched',
        body: 'Limited-time summer promotion.',
        color: 'mint',
      },
    ]);
    console.log('  → 3 annotations inserted.');
  } else {
    console.log('  → SKIPPED: analytics_annotations table not found. Apply supabase/migrations/00005_analytics_annotations.sql to enable annotations.');
  }

  console.log(`Done. Seeded ${orderIds.length} orders, ${seedUserIds.length} customers, ${wishlistInserted} wishlist items, 6 custom requests, 3 discounts${await tableExists('analytics_annotations') ? ', 3 annotations' : ''}.`);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
