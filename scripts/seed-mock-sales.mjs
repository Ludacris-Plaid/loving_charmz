/**
 * Seed realistic mock sales so the admin analytics dashboard has something to
 * show. Idempotent: everything it creates is tagged ('mock': 'true' on the
 * order's shipping_address, or a fixed username prefix for profiles) and swept
 * first on re-run.
 *
 * Talks straight to PostgREST (no supabase-js, so no realtime/WebSocket needs).
 *
 * Usage:
 *   set -a && . scripts/migrate/.env.migrate && set +a
 *   node scripts/seed-mock-sales.mjs
 */
const URL_BASE = (process.env.NEW_SUPABASE_URL || '').replace(/\/$/, '');
const KEY = process.env.NEW_SERVICE_ROLE_KEY;
if (!URL_BASE || !KEY) {
  console.error('Set NEW_SUPABASE_URL and NEW_SERVICE_ROLE_KEY (source scripts/migrate/.env.migrate)');
  process.exit(1);
}

const HEADERS = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  'Content-Type': 'application/json',
};

async function rest(table, { searchParams = {}, method = 'GET', body } = {}) {
  const qs = new URLSearchParams(searchParams).toString();
  const res = await fetch(`${URL_BASE}/rest/v1/${table}${qs ? `?${qs}` : ''}`, {
    method,
    headers: { ...HEADERS, Prefer: method === 'POST' ? 'return=representation' : 'return=minimal' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`${table} ${method} -> ${res.status}: ${await res.text()}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

/** Create (or reuse) mock customers in auth, returning {id, email, name}. */
async function ensureMockUsers() {
  const users = [];
  for (let i = 0; i < CUSTOMERS.length; i++) {
    const name = CUSTOMERS[i];
    const email = `${name.split(' ')[0].toLowerCase()}.${name.split(' ')[1].toLowerCase()}@${MOCK_DOMAIN}`;
    const res = await fetch(`${URL_BASE}/auth/v1/admin/users`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({
        email,
        password: `mock-${crypto.randomUUID().slice(0, 12)}!A`,
        email_confirm: true,
        user_metadata: { display_name: name, mock: true },
      }),
    });
    const payload = await res.json().catch(() => ({}));
    if (res.status === 422 && payload?.code === 'email_exists') {
      // reuse the existing mock user
      const found = await fetch(`${URL_BASE}/auth/v1/admin/users?email=${encodeURIComponent(email)}`, { headers: HEADERS });
      const list = await found.json();
      const u = list?.users?.[0];
      if (!u) throw new Error(`Could not reuse mock user ${email}`);
      users.push({ id: u.id, email, name });
    } else if (!res.ok) {
      throw new Error(`auth user ${email} -> ${res.status}: ${JSON.stringify(payload)}`);
    } else {
      users.push({ id: payload.id, email, name });
    }
  }
  return users;
}

/** Delete a mock auth user (cascades profile + any leftover rows). */
async function deleteMockUser(id) {
  const res = await fetch(`${URL_BASE}/auth/v1/admin/users/${id}`, { method: 'DELETE', headers: HEADERS });
  if (!res.ok && res.status !== 404) throw new Error(`delete user ${id} -> ${res.status}`);
}

const SHIPPING_FLAT = 9.99;
const FREE_SHIPPING_OVER = 50;
const TAX_RATE = 0.08;
const MOCK_DOMAIN = 'mockcustomers.example';
const MARKER = { mock: 'true' };

const CUSTOMERS = ['Hannah M.', 'Grace W.', 'Olivia T.', 'Megan K.', 'Sarah L.', 'Chloe B.', 'Priya S.', 'Emma R.'];
const CITIES = ['Calgary', 'Edmonton', 'Red Deer', 'Lethbridge', 'Banff', 'Airdrie', 'Okotoks'];
const PAY_METHODS = ['card', 'card', 'card', 'card', 'paypal']; // Square-heavy, like real traffic

const round2 = (n) => Math.round(n * 100) / 100;

let seed = 20260917;
const rand = () => {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
};
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const daysAgo = (d, h = 0) => new Date(Date.now() - d * 864e5 - h * 36e5).toISOString();

async function main() {
  // --- existing catalog ----------------------------------------------------
  const products = await rest('products', { searchParams: { select: 'id,name,base_price', is_active: 'eq.true' } });
  if (!products?.length) throw new Error('No active products found');
  console.log(`catalog: ${products.length} active products`);

  // --- sweep previous mock data --------------------------------------------
  const oldOrders = await rest('orders', {
    searchParams: { select: 'id', 'shipping_address->>mock': 'eq.true' },
  });
  if (oldOrders?.length) {
    const ids = oldOrders.map((o) => `("${o.id}")`).join(',');
    await rest('payment_transactions', { method: 'DELETE', searchParams: { order_id: `in.${ids}` } });
    await rest('order_items', { method: 'DELETE', searchParams: { order_id: `in.${ids}` } });
    await rest('orders', { method: 'DELETE', searchParams: { id: `in.${ids}` } });
    console.log(`swept ${oldOrders.length} previous mock orders`);
  }
  // remove prior mock auth users (cascades their profiles)
  const listed = await fetch(`${URL_BASE}/auth/v1/admin/users?per_page=200`, { headers: HEADERS });
  const listedJson = await listed.json();
  for (const u of listedJson?.users || []) {
    if (u.email?.endsWith(`@${MOCK_DOMAIN}`)) await deleteMockUser(u.id);
  }
  await rest('profiles', { method: 'DELETE', searchParams: { username: `like.mockcustomer*` } });

  // --- mock customers (real auth users so profiles/Customers page work) -----
  const profiles = await ensureMockUsers();
  for (const p of profiles) {
    // keep the profile row's display name in sync (trigger may have created it)
    await rest('profiles', {
      method: 'PATCH',
      searchParams: { id: `eq.${p.id}` },
      body: { username: `mockcustomer${profiles.indexOf(p) + 1}`, display_name: p.name },
    });
  }
  const emails = Object.fromEntries(profiles.map((p) => [p.id, p.email]));

  // --- generate orders -------------------------------------------------------
  const ORDER_COUNT = 120;
  const drafts = [];

  for (let i = 0; i < ORDER_COUNT; i++) {
    let daysBack;
    do {
      daysBack = Math.floor(rand() * 150);
    } while (rand() > (daysBack > 36 && daysBack < 50 ? 1.9 : 1)); // promo bump ~6 weeks ago

    const date = daysAgo(daysBack, Math.floor(rand() * 20));
    const itemCount = rand() < 0.82 ? 1 : 2;
    const items = [];
    for (let j = 0; j < itemCount; j++) {
      const p = pick(products);
      const metal = pick(['Brass', 'Stainless Steel']);
      const size = pick(['Small', 'Medium', 'Large']);
      const variantAdj = metal === 'Stainless Steel' ? 25 : 0;
      items.push({
        product_id: p.id,
        product_name: p.name,
        variant_name: `${metal} / ${size}`,
        unit_price: round2(p.base_price + variantAdj),
        quantity: rand() < 0.9 ? 1 : 2,
      });
    }

    const subtotal = round2(items.reduce((s, it) => s + it.unit_price * it.quantity, 0));
    const useDiscount = rand() < 0.06;
    const discount = round2(subtotal * (useDiscount ? 0.1 : 0));
    const shipping = subtotal > FREE_SHIPPING_OVER ? 0 : SHIPPING_FLAT;
    const tax = round2((subtotal - discount) * TAX_RATE);
    const total = round2(subtotal + shipping + tax - discount);

    const roll = rand();
    let status = 'completed';
    let paymentStatus = 'paid';
    if (daysBack <= 2 && roll > 0.75) {
      status = 'pending'; paymentStatus = 'pending';
    } else if (roll < 0.035) {
      status = 'cancelled'; paymentStatus = 'failed';
    } else if (roll < 0.065) {
      status = 'refunded'; paymentStatus = 'refunded';
    }

    const customer = pick(profiles);
    drafts.push({
      draft: {
        user_id: customer.id,
        status,
        subtotal, shipping_cost: shipping, tax, discount, total,
        shipping_address: {
          ...MARKER,
          name: customer.display_name,
          email: emails[customer.id],
          city: pick(CITIES),
          province: 'AB',
          country: 'Canada',
        },
        payment_method: pick(PAY_METHODS),
        payment_status: paymentStatus,
        discount_code: useDiscount ? 'WELCOME10' : null,
        created_at: date,
        updated_at: date,
      },
      items,
    });
  }

  // --- insert orders, then items + transactions ------------------------------
  const inserted = await rest('orders', {
    method: 'POST',
    searchParams: { select: 'id,payment_status,created_at' },
    body: drafts.map((d) => d.draft),
  });

  const itemRows = [];
  const txRows = [];
  inserted.forEach((row, i) => {
    const spec = drafts[i];
    for (const it of spec.items) itemRows.push({ order_id: row.id, ...it });
    const settled = row.payment_status === 'paid' || row.payment_status === 'refunded';
    txRows.push({
      order_id: row.id,
      provider: spec.draft.payment_method === 'paypal' ? 'paypal' : 'square',
      provider_transaction_id: `mock_${crypto.randomUUID().slice(0, 18)}`,
      amount: spec.draft.total,
      currency: 'cad',
      status: settled ? 'captured' : row.payment_status === 'pending' ? 'requires_action' : 'failed',
      provider_data: { mock: true, stage: 'seed' },
      created_at: row.created_at,
    });
  });

  for (let i = 0; i < itemRows.length; i += 200) {
    await rest('order_items', { method: 'POST', body: itemRows.slice(i, i + 200) });
  }
  for (let i = 0; i < txRows.length; i += 200) {
    await rest('payment_transactions', { method: 'POST', body: txRows.slice(i, i + 200) });
  }

  const paid = inserted.filter((o) => o.payment_status === 'paid').length;
  console.log(`seeded ${inserted.length} orders (${paid} paid, ${inserted.length - paid} pending/cancelled/refunded)`);
  console.log(`order_items: ${itemRows.length}, payment_transactions: ${txRows.length}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
