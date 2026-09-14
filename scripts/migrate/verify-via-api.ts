/**
 * Loving Charmz — verify a Supabase project through its APIs only.
 *
 *   npx tsx scripts/migrate/verify-via-api.ts
 *
 * Needed when no database connection string is available (the SQL-level gates in
 * sql/assert-new.sql and sql/rls-smoke.sql require one). It exercises the same
 * guarantees the way a customer or an attacker reaches them — over REST and the
 * Auth API — so it is also a stronger end-to-end check of migration 00007.
 *
 * Requires NEW_SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL), NEW_SERVICE_ROLE_KEY
 * and an anon key (NEW_ANON_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY). Reads
 * scripts/migrate/.env.migrate and .env.local. Creates two throwaway users and
 * deletes them again; nothing else is left behind. Exit code 0 = all passed.
 *
 * Impersonation calls deliberately send apikey = anon key with the user's JWT in
 * Authorization. Using the service key there would bypass RLS and make every
 * customer/security check meaningless.
 */

const BUCKETS = ['avatars', 'product-images'] as const;

type Check = { name: string; pass: boolean; detail: string };
const results: Check[] = [];

function check(name: string, pass: boolean, detail: string) {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name.padEnd(44)} ${detail}`);
}

async function loadEnv() {
  const { config } = await import('dotenv');
  // quiet: dotenv 17 prints an "injected env" banner that drowns the results.
  config({ path: 'scripts/migrate/.env.migrate', quiet: true });
  // .env.local is only a fallback for the anon key; it currently still points at
  // the deleted project, so its URL/service key are deliberately not consulted.
  config({ path: '.env.local', quiet: true });
}

function required(...names: string[]): string {
  for (const name of names) {
    const value = process.env[name];
    if (value) return value;
  }
  throw new Error(`Missing ${names.join(' or ')} (see scripts/migrate/.env.migrate.example)`);
}

type Options = {
  key: string;
  userToken?: string;
  method?: string;
  body?: unknown;
  prefer?: string;
};

async function call(url: string, { key, userToken, method = 'GET', body, prefer }: Options) {
  const res = await fetch(url, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${userToken ?? key}`,
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(prefer ? { Prefer: prefer } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  let parsed: unknown = text;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    /* leave as text */
  }
  return { status: res.status, body: parsed as unknown };
}

/** A member's request must not be silently rejected for the wrong reason. */
const blocked = (status: number) => status === 401 || status === 403;
const rows = (body: unknown): unknown[] => (Array.isArray(body) ? body : []);

async function main() {
  await loadEnv();

  const url = required('NEW_SUPABASE_URL').replace(/\/+$/, '');
  const service = required('NEW_SERVICE_ROLE_KEY');
  const anon = required('NEW_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY');

  if (/otareqhvjbcbiehmgzda/.test(url)) {
    throw new Error(`${url} is the deleted project — set NEW_SUPABASE_URL to the current project`);
  }

  console.log(`\nVerifying ${url} through its APIs (no database credentials needed)\n`);

  // ---- schema present ----------------------------------------------------
  const productsRes = await call(`${url}/rest/v1/products?select=id,name&limit=3`, { key: service });
  check('schema.products_readable', productsRes.status === 200, `HTTP ${productsRes.status}`);

  for (const table of ['collections', 'product_variants', 'orders', 'profiles', 'user_roles']) {
    const res = await call(`${url}/rest/v1/${table}?select=*&limit=1`, { key: service });
    check(`schema.${table}_exists`, res.status === 200, `HTTP ${res.status}`);
  }

  // ---- storage -----------------------------------------------------------
  const bucketRes = await call(`${url}/storage/v1/bucket`, { key: service });
  const ids = rows(bucketRes.body).map((b) => (b as { id: string }).id);
  for (const bucket of BUCKETS) {
    check(`storage.bucket.${bucket}`, ids.includes(bucket), ids.length ? ids.join(', ') : 'no buckets');
  }

  // ---- anon reaches the storefront but cannot write ----------------------
  const anonRead = await call(`${url}/rest/v1/products?select=id&limit=1`, { key: anon });
  check('anon.products_readable', anonRead.status === 200, `HTTP ${anonRead.status}`);

  const anonWrite = await call(`${url}/rest/v1/products`, {
    key: anon,
    method: 'POST',
    prefer: 'return=minimal',
    body: { name: 'anon-injected', slug: `anon-injected-${Date.now()}`, base_price: 1 },
  });
  check('anon.product_write_blocked', blocked(anonWrite.status), `HTTP ${anonWrite.status}`);

  const anonRoles = await call(`${url}/rest/v1/user_roles?select=*&limit=1`, { key: anon });
  check(
    'anon.user_roles_not_readable',
    blocked(anonRoles.status) || rows(anonRoles.body).length === 0,
    `HTTP ${anonRoles.status}, ${rows(anonRoles.body).length} row(s)`,
  );

  // ---- two throwaway members, signed in for real -------------------------
  const stamp = Date.now();
  const createdOrderIds: string[] = [];
  const users: { id: string; email: string; token: string }[] = [];

  const makeUser = async (label: string) => {
    const email = `verify-${label}-${stamp}@verify.invalid`;
    const password = `verify-${stamp}-${label}!A`;
    const created = await call(`${url}/auth/v1/admin/users`, {
      key: service,
      method: 'POST',
      body: { email, password, email_confirm: true },
    });
    if (created.status !== 200 && created.status !== 201) {
      throw new Error(`could not create user ${label}: HTTP ${created.status} ${JSON.stringify(created.body)}`);
    }
    const id = (created.body as { id: string }).id;

    const tokenRes = await call(`${url}/auth/v1/token?grant_type=password`, {
      key: anon,
      method: 'POST',
      body: { email, password },
    });
    if (tokenRes.status !== 200) {
      throw new Error(`could not sign in as ${label}: HTTP ${tokenRes.status} ${JSON.stringify(tokenRes.body)}`);
    }
    return { id, email, token: (tokenRes.body as { access_token: string }).access_token };
  };

  // Baseline BEFORE creating anything: the end-of-run check must prove the
  // project is exactly as we found it (on a fresh project that means the admin
  // slot is still unclaimed, so the operator's own signup becomes the admin).
  const rolesAtStart = await call(`${url}/rest/v1/user_roles?select=user_id`, { key: service });
  const roleRowsAtStart = rows(rolesAtStart.body).length;

  const [userA, userB] = [await makeUser('a'), await makeUser('b')];
  users.push(userA, userB);

  let roleRowsBefore: unknown[] = [];

  try {
    // On a brand-new project promote_first_user_to_admin() grants admin to the
    // first account created. That would make every cross-tenant check below
    // meaningless, because admins may read and write everything — so strip the
    // role from both test users first, and report what the trigger did.
    const rolesBefore = await call(`${url}/rest/v1/user_roles?select=user_id,role`, { key: service });
    roleRowsBefore = rows(rolesBefore.body);
    const autoPromoted = roleRowsBefore.filter((r) =>
      [userA.id, userB.id].includes((r as { user_id: string }).user_id),
    );
    check(
      'info.first_account_auto_admin',
      true,
      autoPromoted.length
        ? `${autoPromoted.length} test user(s) auto-promoted by the signup trigger (expected on a fresh project)`
        : 'no auto-promotion (project already had an admin)',
    );

    for (const user of [userA, userB]) {
      await call(`${url}/rest/v1/user_roles?user_id=eq.${user.id}`, { key: service, method: 'DELETE' });
    }
    const stripped = await call(
      `${url}/rest/v1/user_roles?user_id=in.(${userA.id},${userB.id})&select=role`,
      { key: service },
    );
    check(
      'setup.test_users_not_admin',
      rows(stripped.body).length === 0,
      `${rows(stripped.body).length} role row(s) remain on the test users`,
    );

    // ---- the checkout path that 00007 unblocks ---------------------------
    const ownOrder = await call(`${url}/rest/v1/orders`, {
      key: anon,
      userToken: userA.token,
      method: 'POST',
      prefer: 'return=representation',
      body: { user_id: userA.id, status: 'pending', subtotal: 1, total: 1, payment_status: 'pending' },
    });
    const ownOrderId = (rows(ownOrder.body)[0] as { id?: string } | undefined)?.id;
    if (ownOrderId) createdOrderIds.push(ownOrderId);
    check('customer.order_insert_own', ownOrder.status === 201, `HTTP ${ownOrder.status}`);

    const crossOrder = await call(`${url}/rest/v1/orders`, {
      key: anon,
      userToken: userA.token,
      method: 'POST',
      body: { user_id: userB.id, status: 'pending', subtotal: 1, total: 1 },
    });
    check('customer.order_insert_for_other_blocked', blocked(crossOrder.status), `HTTP ${crossOrder.status}`);

    if (ownOrderId) {
      const ownItem = await call(`${url}/rest/v1/order_items`, {
        key: anon,
        userToken: userA.token,
        method: 'POST',
        body: { order_id: ownOrderId, product_name: 'verify', unit_price: 1, quantity: 1 },
      });
      check('customer.order_item_insert_own', ownItem.status === 201, `HTTP ${ownItem.status}`);

      const crossItem = await call(`${url}/rest/v1/order_items`, {
        key: anon,
        userToken: userB.token,
        method: 'POST',
        body: { order_id: ownOrderId, product_name: 'injected', unit_price: 0.01, quantity: 1 },
      });
      check('customer.order_item_insert_for_other_blocked', blocked(crossItem.status), `HTTP ${crossItem.status}`);
    } else {
      check('customer.order_item_insert_own', false, 'no order id returned');
    }

    const custom = await call(`${url}/rest/v1/personalization_requests`, {
      key: anon,
      userToken: userA.token,
      method: 'POST',
      body: { user_id: userA.id, pet_name: 'Verify', status: 'pending' },
    });
    check('customer.personalization_insert_own', custom.status === 201, `HTTP ${custom.status}`);

    // ---- a member cannot see or edit another member's data ---------------
    const peek = await call(`${url}/rest/v1/orders?user_id=eq.${userB.id}&select=id`, {
      key: anon,
      userToken: userA.token,
    });
    check('customer.cannot_read_other_orders', peek.status === 200 && rows(peek.body).length === 0, `HTTP ${peek.status}, ${rows(peek.body).length} row(s)`);

    const tamper = await call(`${url}/rest/v1/orders?user_id=eq.${userB.id}`, {
      key: anon,
      userToken: userA.token,
      method: 'PATCH',
      prefer: 'return=representation',
      body: { status: 'delivered' },
    });
    const tampered = rows(tamper.body).length;
    check('customer.cannot_update_other_orders', tampered === 0, `${tampered} row(s) changed`);

    // ---- the privilege escalation that 00007 closed ----------------------
    const escalate = await call(`${url}/rest/v1/user_roles`, {
      key: anon,
      userToken: userA.token,
      method: 'POST',
      body: { user_id: userA.id, role: 'admin' },
    });
    check('security.self_promote_to_admin_blocked', blocked(escalate.status), `HTTP ${escalate.status}`);

    const promoteOther = await call(`${url}/rest/v1/user_roles`, {
      key: anon,
      userToken: userA.token,
      method: 'POST',
      body: { user_id: userB.id, role: 'admin' },
    });
    check('security.promote_other_user_blocked', blocked(promoteOther.status), `HTTP ${promoteOther.status}`);
  } finally {
    // ---- cleanup: remove everything this script created ------------------
    if (createdOrderIds.length) {
      await call(`${url}/rest/v1/order_items?order_id=in.(${createdOrderIds.join(',')})`, {
        key: service,
        method: 'DELETE',
      });
    }
    for (const user of users) {
      await call(`${url}/rest/v1/orders?user_id=eq.${user.id}`, { key: service, method: 'DELETE' });
      await call(`${url}/rest/v1/personalization_requests?user_id=eq.${user.id}`, { key: service, method: 'DELETE' });
      await call(`${url}/rest/v1/user_roles?user_id=eq.${user.id}`, { key: service, method: 'DELETE' });
      const deleted = await call(`${url}/auth/v1/admin/users/${user.id}`, { key: service, method: 'DELETE' });
      if (deleted.status >= 400) console.log(`  (cleanup: user ${user.email} -> HTTP ${deleted.status})`);
    }

    // Leave the project exactly as found: if the admin slot was empty, your own
    // first signup must still be the one that claims it.
    const rolesAtEnd = await call(`${url}/rest/v1/user_roles?select=user_id`, { key: service });
    const remaining = rows(rolesAtEnd.body).length;
    check(
      'state.admin_slot_restored',
      remaining === roleRowsAtStart,
      `${remaining} role row(s) after cleanup, ${roleRowsAtStart} before the run`,
    );
    console.log('\ncleaned up both verification users');
  }

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);

  // Distinguish "nothing is set up yet" from "the policies are wrong": a 404 on
  // these tables means the migrations never ran, not that RLS is misconfigured.
  const schemaMissing = failed.filter((f) => f.name.startsWith('schema.') || f.detail.includes('HTTP 404'));
  if (schemaMissing.length === failed.length && failed.length > 0) {
    console.log(
      '\nThe public schema looks missing (HTTP 404 everywhere). Apply the migrations first:\n' +
        '  Option A (no DB password): paste scripts/migrate/generated/apply-all-migrations.sql\n' +
        '            into Dashboard -> SQL Editor -> New query -> Run\n' +
        '  Option B: supabase db push --db-url "<connection string>" --include-all --yes\n' +
        '  Generate the bundle with: npm run db:migrate -- bundle',
    );
  }

  if (failed.length) {
    console.log(
      '\nFailing checks. A FAIL on customer.* or security.* means migration 00007 is not applied —\n' +
        'unless the test users still hold admin (see setup.test_users_not_admin).',
    );
    failed.forEach((f) => console.log(`  ✗ ${f.name} — ${f.detail}`));
    process.exit(1);
  }
}

main().catch((err) => {
  const cause = err instanceof Error && err.cause ? ` (cause: ${String(err.cause)})` : '';
  console.error(`\n${err instanceof Error ? err.message : String(err)}${cause}`);
  process.exit(1);
});

// Marks this file as a module so its top-level names do not collide with the
// other standalone scripts in this directory.
export {};
