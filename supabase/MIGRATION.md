# New Supabase project setup

**Target:** `ivvsglfjlmejwmwofvuw` (new account).
**Source:** `otareqhvjbcbiehmgzda` — **deleted**. Its hostname no longer resolves
(`NXDOMAIN` via public DNS; a paused project would still resolve and answer `503`), so
there is no data to copy. This is a fresh start: schema, catalog seed, new accounts.

The tooling in `scripts/migrate/` was written for a data-preserving move and is retained
for a future one — see [Appendix: moving data from another project](#appendix-moving-data-from-another-project).
For this setup only the schema, seed, env and verification steps below matter.

**Status as of 2026-09-13.** `00001`–`00007` applied to `ivvsglfjlmejwmwofvuw` (16 tables,
34 policies, 2 buckets). Gate check 16/17 — only `auth.at_least_one_admin` fails, which is
the intended state until the first signup. `rls-smoke.sql` 10/10 and `db:verify:api` 23/23
against the live project. Catalog seeded: 3 collections, 8 products, 24 variants. No
accounts exist, so **the admin slot is still free** — sign up first (step 4). `.env.local`
points at the new project; the Vercel environment variables are still to do (step 5).

---

## 1. What you need

| Value | Where |
|---|---|
| Database connection string or password | Dashboard → Project Settings → Database. Use the **direct connection or session pooler (port 5432)**; migrations cannot run through the transaction pooler (6543). |
| Anon / publishable key | Dashboard → Project Settings → API keys (goes in `NEXT_PUBLIC_SUPABASE_ANON_KEY`) |
| Service-role / secret key | Same page → `SUPABASE_SERVICE_ROLE_KEY`. Server-side only, never in the browser. |

Put new-project values into `scripts/migrate/.env.migrate` (gitignored) and the app values
into `.env.local`. `preflight` checks them without ever printing a value:

```bash
npm run db:migrate -- preflight
```

## 2. Apply the schema

**Option A — no database password needed.** The SQL editor runs as the `postgres` role,
so it can create everything the migrations need (tables, triggers, storage policies):

```bash
npm run db:migrate -- bundle   # writes scripts/migrate/generated/apply-all-migrations.sql
```

Open that file, copy all of it, paste into **Dashboard → SQL Editor → New query → Run**.
It wraps every migration in one transaction, refuses to run if `public` already has
tables, and records the applied versions in `supabase_migrations`. Expect a result
bottoming out at `16 public tables`, `34 policies`, `2 buckets`.

**Option B — with the connection string** (Project Settings → Database, direct
connection or port 5432 session pooler):

```bash
supabase db push --db-url "postgresql://postgres.ivvsglfjlmejwmwofvuw:PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres" --include-all --yes --workdir .
# or, with scripts/migrate/.env.migrate filled in:
npm run db:migrate -- schema
```

### Checking it landed

Without a connection string, verify through the APIs (creates two throwaway users,
exercises the real customer and attacker paths over REST, then removes them):

```bash
npm run db:verify:api
```

Expect **19/19**. A `FAIL` on any `customer.*` or `security.*` check means `00007` did not
apply; a wall of `HTTP 404` means the schema is missing entirely.

With SQL access you can run the stricter gates:

```bash
# every gate should PASS except auth.at_least_one_admin, until you sign up (step 4)
psql "$NEW_DB_URL" -X -At -F'|' -f scripts/migrate/sql/assert-new.sql | awk -F'|' '$2=="FAIL"'
psql "$NEW_DB_URL" -X -v ON_ERROR_STOP=1 -f scripts/migrate/sql/rls-smoke.sql   # 10/10 PASS
```

## 3. Seed the catalog

Products, collections, variants only — no fake customers or demo orders in production.
Idempotent (matches by slug, so it is safe to re-run after edits):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://ivvsglfjlmejwmwofvuw.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<new service key> \
npx tsx scripts/seed-products.ts
```

Expect `8 products, 24 new variants across 3 collections`. Add the remaining catalog
(products, images, prices, stock) through `/admin` afterwards.

> If you *do* want the demo analytics dataset (`db:seed` → 120 orders, 12 customers) for
> dashboard screenshots, run it on a non-production project. It writes a
> `metadata->>seed_tag = 'analytics-seed'` marker so it can be cleaned up again.

## 4. First admin

The `promote_first_user_to_admin` trigger makes the **first account created** on a new
project an admin. Sign up before anyone else — including before any invite or test
signup. Verify with:

```sql
select ur.user_id, ur.role, u.email
from public.user_roles ur join auth.users u on u.id = ur.user_id;
```

If someone else got there first, promote yourself explicitly:

```sql
insert into public.user_roles (user_id, role)
select id, 'admin' from auth.users where email = 'you@example.com'
on conflict (user_id, role) do nothing;
```

## 5. Point the app at the new project

`.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://ivvsglfjlmejwmwofvuw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<new anon/publishable key>
SUPABASE_SERVICE_ROLE_KEY=<new service_role key>
```

Vercel (project `loving-charmz`): update the same three variables for Production,
Preview and Development, then redeploy so they are baked into the build.

Also set in the new project's Authentication settings: Site URL, redirect allowlist
(`/auth/callback`, `/account`), email confirmations, and email templates — these are
per-project and do not come from migrations.

## 6. Smoke test

- Sign up → you land as admin and `/admin` loads.
- A second, non-admin account is refused at `/admin`.
- Place an order: it appears in `/account/orders` **and** `/admin/orders` (this is the
  path migration `00007` unblocked — see below).
- Submit a custom order request: it appears in `/admin/personalization`.
- Upload an avatar and reload: it renders (bucket + policies come from migrations).
- Shop/collections/home show product images. (Known unrelated bug: the product detail
  page still forces a placeholder Unsplash image instead of `products.images[0]`.)

## 7. Security fixes this project depends on

`00007_customer_write_policies.sql` is new and is applied by step 2. Without it the
storefront is broken *and* exploitable:

- **Critical:** `00001` shipped `CREATE POLICY "Service role manages roles" ON user_roles
  FOR INSERT WITH CHECK (true)`. The comment claimed service_role needs it; service_role
  bypasses RLS and needs no policy, so the policy instead let **any signed-in user insert
  `{user_id: self, role: 'admin'}`** — a full admin compromise, since `AdminGuard` and
  every `/admin` data path trust `user_roles`. 00007 drops it and gates role management on
  `is_admin()`. `rls-smoke.sql` check 10 reproduces the escalation on a pre-00007 database.
- Customers had **no INSERT policy** on `orders`, `order_items`, or
  `personalization_requests`, so checkout and the custom-order form failed with a raw
  Postgres RLS error. 00007 adds owner-scoped INSERT policies.
- A member who unticked "public" could not read their own `profiles` row, leaving the
  profile page blank. 00007 adds a self-SELECT policy.
- `is_admin`, `handle_new_user` and `promote_first_user_to_admin` are now
  `SET search_path = ''` + fully qualified, closing the definer search-path vector.

Re-runnable any time, on any database — it runs in a transaction and rolls back, so it
leaves no test data even on production:

```bash
psql "$NEW_DB_URL" -X -v ON_ERROR_STOP=1 -f scripts/migrate/sql/rls-smoke.sql   # expect 10/10 PASS
```

## Appendix: moving data from another project

For a future move (another account, a rebuild), when the source project still exists:
`scripts/migrate/migrate.sh` does `preflight → export → schema → import → storage →
rewrite → verify`. Each script and SQL file carries its own header comment explaining
its role. The short version:

```bash
cp scripts/migrate/.env.migrate.example scripts/migrate/.env.migrate   # both projects' DB urls + keys
npm run db:migrate -- preflight      # connectivity, auth column diff, row counts (writes nothing)
npm run db:migrate -- export         # pg_dump public data -> scripts/migrate/dump/
npm run db:migrate -- schema         # apply migrations to the new project
npm run db:migrate -- import --yes   # auth rows + public data + reconciliation
npm run db:migrate -- storage --apply
npm run db:migrate -- rewrite --yes  # repoint stored storage URLs at the new ref
npm run db:migrate -- verify         # diff both databases; all gates must PASS
```

Design notes worth knowing before you touch it:

- **Auth is copied column-by-column over the shared intersection**, not restored from
  `pg_dump`. GoTrue schema drifts between releases (`auth.identities.email` is a
  *generated* column on current versions) and a plain dump restore fails on exactly that.
- Import order is auth → `profiles` → `user_roles` → parents-before-children, and it
  clears the trigger-created placeholder profiles/roles before restoring the real ones.
- `verify.sql` is an equality fingerprint (counts, money sums, orphans, duplicate carts)
  and must diff clean; `assert-new.sql` are new-project gates where a `FAIL` row is the
  signal; `rewrite-urls.sql` moves stored URLs from the old ref to the new one.
- The whole pipeline was rehearsed against a local stack with seeded data: fingerprint
  identical, `remaining_old_ref_rows = 0`, 17/17 gates PASS, storage copy verified,
  `rls-smoke` 10/10.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `pg_dump`/`db push` hangs or fails to connect | Using the transaction pooler (6543). Use the direct connection or session pooler (5432). |
| `new row violates row-level security policy for table "orders"` | Migration `00007` is not applied. |
| Someone has admin who should not | Pre-00007 `user_roles` escalation. Apply `00007`, then `select * from public.user_roles where role='admin';` and delete unexpected rows. |
| `Node.js 20 detected without native WebSocket support` | `@supabase/realtime-js` builds a Realtime client on every `createClient` and refuses to run on Node < 22 without a global. Next's own runtime defines `globalThis.WebSocket` (hence the app is fine); standalone scripts must `import './lib/websocket-polyfill.mjs'` **before** `@supabase/supabase-js` (already done in `scripts/*.ts` and `seed-stock.mjs`). `ws` is a devDependency for this reason. |
| `cannot insert a non-DEFAULT value into column "email"` | GoTrue version skew on `auth` tables — only relevant to the data-move appendix; do not restore `auth` from `pg_dump`. |
| `supabase db push` migration-history mismatch | `--include-all`, or let `migrate.sh schema` fall back to applying files with psql and recording history itself. |

## Cleanup after working locally

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "drop database if exists lc_old;"
supabase stop                  # local stack used for verification
rm -rf scripts/migrate/dump    # data dumps (gitignored)
```
