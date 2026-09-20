#!/usr/bin/env bash
#
# Loving Charmz — SQL integration tests on a disposable Supabase database.
#
# Two modes:
#
#   local (default)   Spin up the Supabase CLI's LOCAL docker stack (postgres +
#                     the bare minimum services), push the repo's migrations
#                     into it, run supabase/tests/*.test.sql, then stop it.
#                     Free-plan friendly, no secrets, hermetic per run.
#
#   branch            Create an ephemeral SUPABASE CLOUD BRANCH instead, push
#                     migrations, test, and always delete it again. Requires
#                     the Pro plan (branching entitlement) plus
#                     SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF — or run
#                     `supabase login` locally so the token comes from disk.
#
# The branch inherits the base project's migration history, so `db push` there
# applies only pending migrations; the local stack always runs the full set,
# which is exactly what we want to prove: that a fresh checkout of the
# migrations yields a working settlement function.
#
# Usage:
#   npm run test:db                                # local docker stack
#   TEST_DB_MODE=branch npm run test:db            # disposable cloud branch
#   KEEP_DB=1 npm run test:db                      # keep the stack/branch for debugging
#
# Exit status is non-zero if any test fails. The suite itself always rolls
# back its transaction, so nothing is left behind in either mode.

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$HERE/.." && pwd)"
TEST_FILE="$REPO_ROOT/supabase/tests/settlement_effects.test.sql"
MODE="${TEST_DB_MODE:-local}"

log()  { printf '\033[1;35m▸\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m! %s\n' "$*" >&2; }
die()  { printf '\033[1;31m✗ %s\n' "$*" >&2; exit 1; }

[[ -f "$TEST_FILE" ]] || die "test file missing: $TEST_FILE"
command -v psql >/dev/null || die "psql not on PATH"

run_suite() {
  log "running SQL integration suite"
  psql "$1" -X -v ON_ERROR_STOP=1 -f "$TEST_FILE"
}

# ---------------------------------------------------------------- local mode
run_local() {
  command -v supabase >/dev/null || die "supabase CLI not on PATH"
  docker info >/dev/null 2>&1 || die "docker is not running (required for the local stack)"

  log "starting disposable local Supabase stack (postgres + postgrest)"
  # Only the DB and its API layer are needed; auth/storage/UI/analytics are
  # skipped to keep the startup fast. --ignore-health-check lets slow first
  # pulls proceed; the db-up loop below is the real readiness gate.
  supabase start -x gotrue,storage-api,imgproxy,studio,realtime,logflare,edge-runtime,inbucket,vector,analytics \
    --ignore-health-check

  local db_url="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
  log "waiting for the local database to accept connections"
  local up=""
  for _ in $(seq 1 30); do
    if psql "$db_url" -X -tAc 'select 1' >/dev/null 2>&1; then up=1; break; fi
    sleep 2
  done
  [[ -n "$up" ]] || die "local database never accepted connections"

  stop_stack() {
    if [[ "${KEEP_DB:-}" == "1" ]]; then
      log "KEEP_DB=1 — local stack left running (stop it with: supabase stop --no-backup)"
      return
    fi
    log "stopping the local stack"
    supabase stop --no-backup >/dev/null 2>&1 || warn "supabase stop failed — check docker"
  }
  trap stop_stack EXIT

  log "pushing migrations"
  supabase db push --local --include-all --yes

  run_suite "$db_url"
  log "local mode: all SQL integration tests passed"
}

# --------------------------------------------------------------- branch mode
run_branch() {
  command -v supabase >/dev/null || die "supabase CLI not on PATH"
  [[ -n "${SUPABASE_ACCESS_TOKEN:-}" || -f "$HOME/.supabase/access-token" ]] \
    || die "SUPABASE_ACCESS_TOKEN is not set (and no token saved via supabase login)"
  [[ -n "${SUPABASE_PROJECT_REF:-}" ]] \
    || die "SUPABASE_PROJECT_REF is not set (the base project ref)"
  command -v node >/dev/null || die "node not on PATH"

  export SUPABASE_ACCESS_TOKEN
  BRANCH_NAME="${BRANCH_NAME:-ci-settlement-$(date +%Y%m%d-%H%M%S)}-$$"

  # Supabase CLI: subcommand first, flags after it. The latest CLI rejects
  # --project-ref placed before the subcommand; this ordering works on both.
  sbx() {
    supabase "$@" --experimental --project-ref "$SUPABASE_PROJECT_REF" --workdir "$REPO_ROOT"
  }

  ENV_OUT="$(mktemp)"
  local rm_env=0
  cleanup() {
    if [[ "${KEEP_BRANCH:-}" == "1" ]]; then
      log "KEEP_BRANCH=1 — branch '$BRANCH_NAME' left in place (delete it manually)"
    else
      log "deleting branch '$BRANCH_NAME'"
      sbx branches delete "$BRANCH_NAME" >/dev/null 2>&1 \
        || warn "branch delete failed — remove '$BRANCH_NAME' from the dashboard"
    fi
    (( rm_env )) && rm -f "$ENV_OUT"
  }
  trap cleanup EXIT

  log "creating disposable branch '$BRANCH_NAME' (requires the Supabase Pro plan)"
  # -o env saves whatever credentials the CLI emits; the canonical fetch
  # happens via `branches get` below once the branch is active.
  sbx branches create "$BRANCH_NAME" --yes -o env > "$ENV_OUT" \
    || die "branch creation failed (is branching enabled on your plan?)"
  rm_env=1

  log "waiting for the branch to become active"
  ready=""
  for _ in $(seq 1 36); do
    status="$(sbx branches list -o json 2>/dev/null \
      | BRANCH_NAME="$BRANCH_NAME" node -e '
          let d = "";
          process.stdin.on("data", (c) => (d += c));
          process.stdin.on("end", () => {
            try {
              const j = JSON.parse(d);
              const arr = Array.isArray(j) ? j : j.branches || [];
              const b = arr.find((x) => x.name === process.env.BRANCH_NAME || x.id === process.env.BRANCH_NAME);
              console.log((b && (b.status || b.state)) || "unknown");
            } catch {
              console.log("unknown");
            }
          });' 2>/dev/null || echo unknown)"
    if [[ "$status" == "active" || "$status" == "ready" ]]; then
      ready=1
      break
    fi
    sleep 5
  done
  [[ -n "$ready" ]] || warn "branch did not report active in time — attempting to continue"

  # Canonical credential fetch (same pattern as Supabase's custom-ORM CI docs).
  if ! sbx branches get "$BRANCH_NAME" -o env > "$ENV_OUT" 2>/dev/null; then
    warn "branches get failed — falling back to the create command's env output"
  fi
  # shellcheck disable=SC1090
  source "$ENV_OUT"

  DB="${POSTGRES_URL_NON_POOLING:-${BRANCH_DB_URL:-${DB_URL:-${POSTGRES_URL:-}}}}"
  [[ -n "$DB" ]] || die "could not resolve the branch database URL (env keys: $(grep -oE '^[A-Z_]+' "$ENV_OUT" | tr '\n' ' '))"

  log "waiting for the branch database to accept connections"
  db_up=""
  for _ in $(seq 1 10); do
    if psql "$DB" -X -tAc 'select 1' >/dev/null 2>&1; then db_up=1; break; fi
    sleep 6
  done
  [[ -n "$db_up" ]] || die "branch database never accepted connections"

  log "pushing migrations to the branch"
  sbx db push --db-url "$DB" --include-all --yes

  run_suite "$DB"
  log "branch mode: all SQL integration tests passed"
}

case "$MODE" in
  local)  run_local  ;;
  branch) run_branch ;;
  *) die "unknown TEST_DB_MODE: $MODE (expected 'local' or 'branch')" ;;
esac
