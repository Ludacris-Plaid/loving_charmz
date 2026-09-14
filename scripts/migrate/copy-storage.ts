/**
 * Loving Charmz — copy Supabase Storage objects between projects.
 *
 *   npx tsx scripts/migrate/copy-storage.ts            # dry run: list + count
 *   npx tsx scripts/migrate/copy-storage.ts --apply    # actually copy
 *   npx tsx scripts/migrate/copy-storage.ts --verify   # compare counts only
 *
 * Requires OLD_SUPABASE_URL / OLD_SERVICE_ROLE_KEY and
 * NEW_SUPABASE_URL / NEW_SERVICE_ROLE_KEY (see scripts/migrate/.env.migrate.example).
 * Nothing is written to the old project; dry run is the default.
 *
 * Uses the Storage REST API over fetch rather than @supabase/supabase-js: on
 * Node 20 supabase-js throws while initialising its Realtime client
 * ("Node.js 20 detected without native WebSocket support") and this script
 * needs no realtime, auth, or query features.
 */

const BUCKETS = ['avatars', 'product-images'] as const;
const PAGE = 100;

type StorageEntry = { id: string | null; name: string; metadata?: { mimetype?: string } | null };

const flags = new Set(process.argv.slice(2).filter((a) => a.startsWith('--')));
const APPLY = flags.has('--apply');
const VERIFY_ONLY = flags.has('--verify');

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`✗ ${name} is not set. See scripts/migrate/.env.migrate.example`);
    process.exit(1);
  }
  return value.replace(/\/+$/, '');
}

const OLD_URL = required('OLD_SUPABASE_URL');
const OLD_KEY = required('OLD_SERVICE_ROLE_KEY');
const NEW_URL = required('NEW_SUPABASE_URL');
const NEW_KEY = required('NEW_SERVICE_ROLE_KEY');

function headers(key: string, extra: Record<string, string> = {}) {
  return { apikey: key, Authorization: `Bearer ${key}`, ...extra };
}

/** Storage has no recursive listing, so walk prefixes depth-first. */
async function listAll(baseUrl: string, key: string, bucket: string, prefix = ''): Promise<string[]> {
  const paths: string[] = [];
  let offset = 0;

  for (;;) {
    const res = await fetch(`${baseUrl}/storage/v1/object/list/${bucket}`, {
      method: 'POST',
      headers: headers(key, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({ prefix, limit: PAGE, offset, sortBy: { column: 'name', order: 'asc' } }),
    });
    if (!res.ok) throw new Error(`list ${bucket}/${prefix}: ${res.status} ${await res.text()}`);

    const entries = (await res.json()) as StorageEntry[];
    if (!Array.isArray(entries) || entries.length === 0) break;

    for (const entry of entries) {
      const child = prefix ? `${prefix}/${entry.name}` : entry.name;
      // Folders come back with a null id; objects have one.
      if (entry.id === null) paths.push(...(await listAll(baseUrl, key, bucket, child)));
      else paths.push(child);
    }

    if (entries.length < PAGE) break;
    offset += entries.length;
  }

  return paths;
}

function contentTypeFor(path: string, fromServer: string | null): string {
  if (fromServer && fromServer !== 'application/octet-stream' && fromServer !== 'text/plain') return fromServer;
  switch (path.split('.').pop()?.toLowerCase()) {
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'webp':
      return 'image/webp';
    case 'svg':
      return 'image/svg+xml';
    default:
      return fromServer ?? 'application/octet-stream';
  }
}

async function download(baseUrl: string, key: string, bucket: string, path: string) {
  const res = await fetch(`${baseUrl}/storage/v1/object/${bucket}/${encodeURI(path)}`, { headers: headers(key) });
  if (!res.ok) throw new Error(`download: ${res.status} ${await res.text()}`);
  return { body: await res.arrayBuffer(), type: res.headers.get('content-type') };
}

async function upload(baseUrl: string, key: string, bucket: string, path: string, body: ArrayBuffer, contentType: string) {
  const res = await fetch(`${baseUrl}/storage/v1/object/${bucket}/${encodeURI(path)}`, {
    method: 'POST',
    headers: headers(key, {
      'Content-Type': contentType,
      'Cache-Control': 'max-age=31536000',
      'x-upsert': 'true',
    }),
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    if (/already exists/i.test(text)) return 'exists' as const;
    throw new Error(`${res.status} ${text}`);
  }
  return 'created' as const;
}

async function main() {
  let copied = 0;
  let skipped = 0;
  const failures: string[] = [];

  for (const bucket of BUCKETS) {
    const sourcePaths = await listAll(OLD_URL, OLD_KEY, bucket);
    console.log(`\n▸ ${bucket}: ${sourcePaths.length} objects in the source project`);

    if (VERIFY_ONLY) {
      const targetPaths = new Set(await listAll(NEW_URL, NEW_KEY, bucket));
      const missing = sourcePaths.filter((p) => !targetPaths.has(p));
      console.log(`  target has ${targetPaths.size}; missing ${missing.length}`);
      missing.slice(0, 20).forEach((p) => console.log(`    missing: ${p}`));
      if (missing.length) failures.push(`${bucket}: ${missing.length} objects missing`);
      continue;
    }

    if (!APPLY) {
      sourcePaths.slice(0, 5).forEach((p) => console.log(`  would copy ${p}`));
      if (sourcePaths.length > 5) console.log(`  … and ${sourcePaths.length - 5} more`);
      continue;
    }

    for (const path of sourcePaths) {
      try {
        const { body, type } = await download(OLD_URL, OLD_KEY, bucket, path);
        const result = await upload(NEW_URL, NEW_KEY, bucket, path, body, contentTypeFor(path, type));
        if (result === 'exists') skipped += 1;
        else copied += 1;
        if ((copied + skipped) % 25 === 0) console.log(`  handled ${copied + skipped}…`);
      } catch (err) {
        failures.push(`${bucket}/${path}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  console.log(
    `\n${VERIFY_ONLY ? 'verify' : APPLY ? 'apply' : 'dry run'} complete — copied ${copied}, skipped ${skipped}, failed ${failures.length}`,
  );
  failures.slice(0, 40).forEach((f) => console.error(`  ✗ ${f}`));

  if (failures.length) process.exit(1);
  if (!APPLY && !VERIFY_ONLY) console.log('Re-run with --apply to write the objects to the new project.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

// Marks this file as a module so its top-level names do not collide with the
// other standalone scripts in this directory.
export {};
