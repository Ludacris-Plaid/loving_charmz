#!/usr/bin/env bash
#
# Loving Charmz — Supabase project migration
#
# Two jobs:
#   1. Bring a NEW project up (schema, gates) — the current project is
#      ivvsglfjlmejwmwofvuw. The previous one (otareqhvjbcbiehmgzda) was
#      deleted, so there is no data to move.
#   2. Move schema + data + auth users + storage between projects, for a future
#      relocation where the source project still exists.
#
#   bash scripts/migrate/migrate.sh preflight   # check env, tooling, connectivity
#   bash scripts/migrate/migrate.sh schema      # apply supabase/migrations to NEW
#   bash scripts/migrate/migrate.sh bundle      # one paste-ready SQL script for the SQL editor
#   bash scripts/migrate/migrate.sh verify      # diff both projects, assert clean
#   bash scripts/migrate/migrate.sh export      # dump old project to scripts/migrate/dump
#   bash scripts/migrate/migrate.sh import --yes        # load dump into NEW
#   bash scripts/migrate/migrate.sh storage --apply     # copy storage objects
#   bash scripts/migrate/migrate.sh rewrite --yes       # point stored URLs at NEW
#   bash scripts/migrate/migrate.sh all --yes   # schema -> import -> rewrite -> verify
#
# Credentials come from scripts/migrate/.env.migrate (gitignored) or the
# ambient environment. Nothing here writes to the OLD project.
#
# API-level checks need no database credentials at all: see verify-via-api.ts.

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$HERE/../.." && pwd)"
DUMP_DIR="$HERE/dump"
SQL_DIR="$HERE/sql"
ENV_FILE="$HERE/.env.migrate"

OLD_REF_DEFAULT="otareqhvjbcbiehmgzda"
NEW_REF_DEFAULT="ivvsglfjlmejwmwofvuw"

log()  { printf '\033[1;35m▸\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m!\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[1;31m✗\033[0m %s\n' "$*" >&2; exit 1; }

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  set -a; source "$ENV_FILE"; set +a
  log "loaded $ENV_FILE"
fi

# The app's own .env.local already holds the OLD project's URL and service_role
# key, so fall back to it rather than asking for them twice. Loaded after the
# migration file so explicit values there always win.
if [[ -f "$REPO_ROOT/.env.local" ]]; then
  # shellcheck disable=SC1091
  set -a; source "$REPO_ROOT/.env.local"; set +a
fi

: "${OLD_SUPABASE_URL:=${NEXT_PUBLIC_SUPABASE_URL:-}}"
: "${OLD_SERVICE_ROLE_KEY:=${SUPABASE_SERVICE_ROLE_KEY:-}}"

: "${OLD_DB_URL:=}"
: "${NEW_DB_URL:=}"
: "${OLD_SUPABASE_URL:=}"
: "${OLD_SERVICE_ROLE_KEY:=}"
: "${NEW_SUPABASE_URL:=}"
: "${NEW_SERVICE_ROLE_KEY:=}"
# Derive the project refs from the URLs when they are not given explicitly.
ref_of() { printf '%s' "$1" | sed -E 's#^https?://([^.]+)\..*$#\1#'; }
: "${OLD_REF:=${OLD_SUPABASE_URL:+$(ref_of "$OLD_SUPABASE_URL")}}"
: "${NEW_REF:=${NEW_SUPABASE_URL:+$(ref_of "$NEW_SUPABASE_URL")}}"
: "${OLD_REF:=$OLD_REF_DEFAULT}"
: "${NEW_REF:=$NEW_REF_DEFAULT}"

# Data-only restore order. Parents before children so every FK is satisfied
# without needing session_replication_role (not available to the postgres role
# on Supabase cloud).
PUBLIC_TABLES=(
  profiles
  user_roles
  collections
  products
  collection_products
  product_variants
  carts
  cart_items
  orders
  order_items
  wishlists
  discounts
  content_blocks
  personalization_requests
  payment_transactions
  analytics_annotations
)

require_urls() {
  [[ -n "$OLD_DB_URL" ]] || die "OLD_DB_URL is not set (see scripts/migrate/.env.migrate.example)"
  [[ -n "$NEW_DB_URL" ]] || die "NEW_DB_URL is not set (see scripts/migrate/.env.migrate.example)"
  case "$OLD_DB_URL" in *":6543"*) warn "OLD_DB_URL looks like the transaction pooler (6543); pg_dump needs the direct connection or port 5432 session pooler";; esac
  case "$NEW_DB_URL" in *":6543"*) warn "NEW_DB_URL looks like the transaction pooler (6543); migrations/restore need port 5432 or the session pooler";; esac
}

require_new_url() {
  [[ -n "$NEW_DB_URL" ]] || die "NEW_DB_URL is not set"
}

psql_old() { psql "$OLD_DB_URL" -X -v ON_ERROR_STOP=1 "$@"; }
psql_new() { psql "$NEW_DB_URL" -X -v ON_ERROR_STOP=1 "$@"; }

# Data files start with `SELECT set_config('search_path', '', false);`, which
# prints a one-row result per file. Silence script-driven runs.
psql_file_quiet() { psql "$1" -X -q -v ON_ERROR_STOP=1 -o /dev/null -f "$2"; }

# ---------------------------------------------------------------- preflight
cmd_preflight() {
  # Report presence and length only — never the values themselves.
  local missing=0 v value
  for v in OLD_DB_URL NEW_DB_URL OLD_SUPABASE_URL OLD_SERVICE_ROLE_KEY NEW_SUPABASE_URL NEW_SERVICE_ROLE_KEY; do
    value="${!v:-}"
    if [[ -n "$value" ]]; then
      printf '    %-24s set (%s chars)\n' "$v" "${#value}"
    else
      printf '    %-24s MISSING\n' "$v"
      missing=1
    fi
  done
  log "project refs: old=$OLD_REF new=$NEW_REF"
  [[ "$missing" == "0" ]] || die "fill the missing values in $ENV_FILE (or the ambient environment)"

  require_urls
  for bin in psql pg_dump supabase node; do
    command -v "$bin" >/dev/null || die "missing required binary: $bin"
  done

  log "old server: $(psql_old -At -c 'select version()' | head -1)"
  log "new server: $(psql_new -At -c 'select version()' | head -1)"

  local old_tables new_tables
  old_tables="$(psql_old -At -c "select tablename from pg_tables where schemaname='public' order by 1")"
  new_tables="$(psql_new -At -c "select tablename from pg_tables where schemaname='public' order by 1")"

  if [[ -n "$new_tables" ]]; then
    warn "NEW project already has public tables:"
    printf '%s\n' "$new_tables" | sed 's/^/    /'
    warn "run 'schema' will skip applying migrations it thinks are already applied; use a fresh project or --include-all"
  else
    log "new project public schema is empty — good starting point"
  fi

  # GoTrue changes between releases (e.g. auth.identities.email became a
  # generated column). The auth copy only transfers columns present on BOTH
  # sides, so drift is reported here for information, not treated as fatal.
  local t common
  for t in users identities; do
    log "auth.$t columns: $(auth_columns_only old "$t" | wc -l | tr -d ' ') old, $(auth_columns_only new "$t" | wc -l | tr -d ' ') new"
    common="$(auth_common_columns "$t" | wc -l | tr -d ' ')"
    log "  transferring $common shared column(s)"
    diff -u <(auth_columns_only old "$t") <(auth_columns_only new "$t") \
      | sed 's/^/    /' || warn "auth.$t column sets differ — only the intersection is copied"
  done

  local new_users
  new_users="$(psql_new -At -c 'select count(*) from auth.users')"
  if [[ "$new_users" != "0" ]]; then
    warn "NEW project already has $new_users auth users — 'import' refuses to run unless FORCE_IMPORT=1"
  fi

  log "row counts on the old project:"
  printf '    %-42s %s\n' 'auth.users' "$(psql_old -At -c 'select count(*) from auth.users')"
  printf '    %-42s %s\n' 'auth.identities' "$(psql_old -At -c 'select count(*) from auth.identities')"
  local t n
  for t in "${PUBLIC_TABLES[@]}"; do
    n="$(psql_old -At -c "select count(*) from public.$t" 2>/dev/null || echo 'n/a')"
    printf '    %-42s %s\n' "public.$t" "$n"
  done

  log "preflight done — nothing was written"
}

# ------------------------------------------------------------------- export
cmd_export() {
  require_urls
  mkdir -p "$DUMP_DIR"
  rm -f "$DUMP_DIR"/*.sql
  log "exporting data-only dumps to $DUMP_DIR"

  # Auth rows are NOT dumped here on purpose: GoTrue's schema drifts between
  # releases, so they are streamed column-by-column during 'import' instead
  # (see copy_auth). A schema-shaped snapshot is kept for reference only.
  pg_dump "$OLD_DB_URL" --schema-only --no-owner --no-privileges \
    --table=auth.users --table=auth.identities \
    -f "$DUMP_DIR/auth.schema.reference.sql"

  local t
  for t in "${PUBLIC_TABLES[@]}"; do
    pg_dump "$OLD_DB_URL" --data-only --no-owner --no-privileges --table="public.$t" \
      -f "$DUMP_DIR/public.$t.sql"
  done

  # Schema snapshot kept for audit/diffing only — migrations are the source of truth.
  pg_dump "$OLD_DB_URL" --schema-only --no-owner --no-privileges --schema=public \
    -f "$DUMP_DIR/public.schema.reference.sql"

  log "wrote $(find "$DUMP_DIR" -name '*.sql' | wc -l | tr -d ' ') files"
  log "row payloads per file (pg_dump uses COPY by default):"
  local f n
  for f in "$DUMP_DIR"/public.*.sql; do
    n="$(grep -cE '^(INSERT INTO|COPY )' "$f" || true)"
    printf '    %-46s %s\n' "$(basename "$f")" "$n"
  done
}

# ------------------------------------------------------------------- schema
cmd_schema() {
  require_new_url
  local mode="${1:---include-all}"

  log "applying $REPO_ROOT/supabase/migrations to the new project"
  if supabase db push --db-url "$NEW_DB_URL" --include-all "$mode" --yes --workdir "$REPO_ROOT"; then
    log "supabase db push completed"
  else
    warn "supabase db push failed — falling back to applying migration files with psql"
    schema_via_psql
  fi

  psql_new -At -c "
    select 'public tables: ' || count(*) from pg_tables where schemaname = 'public';
    select 'policies: ' || count(*) from pg_policies where schemaname = 'public';
    select 'buckets: ' || count(*) from storage.buckets;"
}

schema_via_psql() {
  psql_new -c "create schema if not exists supabase_migrations;
               create table if not exists supabase_migrations.schema_migrations (
                 version text primary key,
                 statements text[],
                 name text
               );"
  local f base version
  for f in "$REPO_ROOT"/supabase/migrations/*.sql; do
    base="$(basename "$f")"
    version="${base%%_*}"
    log "  psql < $base"
    psql_new -f "$f"
    psql_new -c "insert into supabase_migrations.schema_migrations (version, name)
                 values ('$version', '${base%.sql}')
                 on conflict (version) do nothing;"
  done
}

# -------------------------------------------------------------- auth copy
# Column names present in both projects, in source order, for auth.<table>.
auth_columns_only() {
  local which="$1" table="$2" url
  if [[ "$which" == "old" ]]; then url="$OLD_DB_URL"; else url="$NEW_DB_URL"; fi
  psql "$url" -X -At -c "
    select column_name from information_schema.columns
    where table_schema = 'auth' and table_name = '$table'
      and is_generated = 'NEVER'
    order by ordinal_position"
}

auth_common_columns() {
  comm -12 <(auth_columns_only old "$1" | sort) <(auth_columns_only new "$1" | sort)
}

# Stream auth rows with COPY (text format, so NULL stays '\N' and empty
# strings stay empty). Only shared columns transfer, which is what makes this
# survive GoTrue schema drift — a plain pg_dump restore does not.
copy_auth() {
  log "1/4 auth rows (triggers fire here: handle_new_user creates placeholder profiles)"
  local table cols
  for table in users identities; do
    cols="$(auth_common_columns "$table" | paste -sd, - | sed 's/,/, /g')"
    [[ -n "$cols" ]] || die "no shared columns for auth.$table — check both projects"
    log "  auth.$table ($(echo "$cols" | tr -cd ',' | wc -c | tr -d ' ')+1 columns)"
    psql "$OLD_DB_URL" -X -q -c "\\copy (select $cols from auth.$table) to stdout" \
      | psql_new -q -o /dev/null -c "\\copy auth.$table ($cols) from stdin"
  done
}

# ------------------------------------------------------------------- import
cmd_import() {
  require_urls
  local confirm="${1:-}"
  [[ "$confirm" == "--yes" ]] || die "import writes to the new project — re-run with --yes"
  [[ -d "$DUMP_DIR" ]] || die "no dump found in $DUMP_DIR — run 'export' first"

  # Refuse to load into a project that already holds app data.
  local existing existing_users
  existing="$(psql_new -At -c "select coalesce(sum(n_live_tup),0) from pg_stat_user_tables where relname in ('orders','products','profiles')")"
  existing_users="$(psql_new -At -c 'select count(*) from auth.users')"
  if [[ "${existing:-0}" -gt 0 || "${existing_users:-0}" -gt 0 ]] && [[ "${FORCE_IMPORT:-}" != "1" ]]; then
    die "new project is not empty ($existing app rows, $existing_users auth users) — set FORCE_IMPORT=1 to override"
  fi

  copy_auth

  log "2/4 clearing trigger-generated placeholder rows"
  psql_new -q -c "delete from public.profiles; delete from public.user_roles;"

  log "3/4 public tables in FK-safe order"
  local t
  for t in "${PUBLIC_TABLES[@]}"; do
    if [[ -s "$DUMP_DIR/public.$t.sql" ]]; then
      log "  $t"
      psql_file_quiet "$NEW_DB_URL" "$DUMP_DIR/public.$t.sql"
    fi
  done

  log "4/4 post-import reconciliation"
  psql_new -q -v ON_ERROR_STOP=1 -f "$REPO_ROOT/scripts/migrate/sql/post-import.sql"

  log "imported — run 'verify' next"
}

# ------------------------------------------------------------------ storage
cmd_storage() {
  [[ -n "$OLD_SUPABASE_URL" && -n "$OLD_SERVICE_ROLE_KEY" ]] || die "OLD_SUPABASE_URL / OLD_SERVICE_ROLE_KEY required"
  [[ -n "$NEW_SUPABASE_URL" && -n "$NEW_SERVICE_ROLE_KEY" ]] || die "NEW_SUPABASE_URL / NEW_SERVICE_ROLE_KEY required"
  local flag="${1:-}"
  log "copying storage objects (pass --apply to write; default is a dry run)"
  npx --no-install tsx "$HERE/copy-storage.ts" "$flag"
}

# ------------------------------------------------------------------ rewrite
cmd_rewrite() {
  require_new_url
  local confirm="${1:-}"
  [[ "$confirm" == "--yes" ]] || die "rewrite mutates the new project — re-run with --yes"
  log "rewriting hardcoded $OLD_REF URLs to $NEW_REF"
  psql_new -v old_ref="$OLD_REF" -v new_ref="$NEW_REF" -f "$SQL_DIR/rewrite-urls.sql"
}

# ------------------------------------------------------------------- verify
cmd_verify() {
  require_urls
  local old_out="$DUMP_DIR/verify.old.txt" new_out="$DUMP_DIR/verify.new.txt"
  mkdir -p "$DUMP_DIR"

  psql_old -At -F'|' -v ref="$OLD_REF" -f "$SQL_DIR/verify.sql" > "$old_out"
  psql_new -At -F'|' -v ref="$OLD_REF" -f "$SQL_DIR/verify.sql" > "$new_out"

  log "comparing old vs new (expected: row counts match, new-project policy checks pass)"
  if diff -u "$old_out" "$new_out" > "$DUMP_DIR/verify.diff"; then
    log "no differences"
  else
    warn "differences found — $DUMP_DIR/verify.diff"
    sed 's/^/    /' "$DUMP_DIR/verify.diff"
  fi

  log "new-project gates:"
  local report failures
  report="$(psql_new -At -F'|' -f "$SQL_DIR/assert-new.sql")"
  printf '%s\n' "$report" | sed 's/^/    /'
  failures="$(printf '%s\n' "$report" | grep -c '|FAIL|' || true)"
  [[ "$failures" == "0" ]] || die "$failures gate(s) failed — fix before cutover (see supabase/MIGRATION.md)"
  log "all new-project gates passed"
}

# ------------------------------------------------------------------- bundle
# Concatenate every migration into one paste-ready script for the Supabase SQL
# editor, for when no database connection string is available. The editor runs
# as the postgres role, so it can create tables, triggers and storage policies.
cmd_bundle() {
  local out="$HERE/generated/apply-all-migrations.sql"
  mkdir -p "$(dirname "$out")"

  {
    cat <<'HEADER'
-- Loving Charmz — all migrations in one paste-ready script.
-- GENERATED by `npm run db:migrate -- bundle`; do not edit by hand.
--
-- Use only when no database connection string is available:
--   Supabase Dashboard -> SQL Editor -> New query -> paste this whole file -> Run
--
-- Safe to paste into a FRESH project. It refuses to run if the public schema
-- already has tables, so a half-applied database cannot be made worse; use
-- `supabase db push` (or the psql path) once you have DB credentials.

begin;

do $$
begin
  if exists (select 1 from pg_tables where schemaname = 'public') then
    raise exception
      'public schema already has tables — this bundle is for a fresh project. Use supabase db push instead.';
  end if;
end $$;

create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (
  version text primary key,
  statements text[],
  name text
);

HEADER

    local f base version
    for f in "$REPO_ROOT"/supabase/migrations/*.sql; do
      base="$(basename "$f")"
      version="${base%%_*}"
      printf '\n-- ============================================================================\n'
      printf -- '-- %s\n' "$base"
      printf -- '-- ============================================================================\n'
      cat "$f"
      printf "\ninsert into supabase_migrations.schema_migrations (version, name)\n"
      printf "values ('%s', '%s') on conflict (version) do nothing;\n" "$version" "${base%.sql}"
    done

    cat <<'FOOTER'

commit;

-- Sanity check: expect 16 public tables, 34 policies and 2 buckets.
select 'public tables: ' || count(*) from pg_tables where schemaname = 'public'
union all select 'policies: ' || count(*) from pg_policies where schemaname = 'public'
union all select 'buckets: ' || count(*) from storage.buckets;
FOOTER
  } > "$out"

  log "wrote $out ($(wc -l < "$out" | tr -d ' ') lines)"
  log "open it, copy everything, paste into Dashboard -> SQL Editor -> Run"
}

cmd_all() {
  local confirm="${1:-}"
  [[ "$confirm" == "--yes" ]] || die "all runs import + rewrite — re-run with --yes"
  cmd_preflight
  cmd_export
  cmd_schema
  cmd_import --yes
  cmd_storage --apply
  cmd_rewrite --yes
  cmd_verify
}

usage() {
  sed -n '2,23p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
}

case "${1:-}" in
  preflight) shift; cmd_preflight "$@" ;;
  export)    shift; cmd_export "$@" ;;
  schema)    shift; cmd_schema "$@" ;;
  import)    shift; cmd_import "$@" ;;
  storage)   shift; cmd_storage "$@" ;;
  rewrite)   shift; cmd_rewrite "$@" ;;
  verify)    shift; cmd_verify "$@" ;;
  bundle)    shift; cmd_bundle "$@" ;;
  all)       shift; cmd_all "$@" ;;
  *)         usage; exit 1 ;;
esac
