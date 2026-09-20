#!/usr/bin/env bash
#
# Loving Charmz — disposable Supabase branch for the SQL integration suite.
#
# Creates an ephemeral Supabase branch from the linked project, pushes the
# repo's migrations into it, runs supabase/tests/*.test.sql against it, and
# ALWAYS deletes the branch again — pass or fail. The branch inherits the
# migration history of its base project, so `db push` only applies what is
# pending (typically nothing, plus the migration under review).
#
# Requirements:
#   SUPABASE_ACCESS_TOKEN   personal access token (dashboard → account → tokens)
#   SUPABASE_PROJECT_REF    the base project ref, e.g. ivvsglfjlmejwmwofvuw
#   supabase CLI >= 2.x and psql on PATH
#
# Usage:
#   bash scripts/test-branch.sh                    # run the whole suite
#   KEEP_BRANCH=1 bash scripts/test-branch.sh      # keep the branch for debugging
#
# On failure the script exits non-zero after printing the suite output.

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$HERE/.." && pwd)"

log()  { printf '\033[1;35m▸\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m! %s\n' "$*" >&2; }
die()  { printf '\033[1;31m✗ %s\n' "$*" >&2; exit 1; }

: "${SUPABASE_ACCESS_TOKEN:=}"
: "${SUPABASE_PROJECT_REF:=}"
[[ -n "$SUPABASE_ACCESS_TOKEN" ]] || die "SUPABASE_ACCESS_TOKEN is not set"
[[ -n "$SUPABASE_PROJECT_REF" ]] || die "SUPABASE_PROJECT_REF is not set"
command -v supabase >/dev/null || die "supabase CLI not on PATH"
command -v psql >/dev/null || die "psql not on PATH"
command -v node >/dev/null || die "node not on PATH"

export SUPABASE_ACCESS_TOKEN
BRANCH_NAME="${BRANCH_NAME:-ci-settlement-$(date +%Y%m%d-%H%M%S)}-$$"
BRANCH_ARGS=(--experimental --project-ref "$SUPABASE_PROJECT_REF" --workdir "$REPO_ROOT")
ENV_OUT="$(mktemp)"
trap 'rm -f "$ENV_OUT"' EXIT

cleanup() {
  if [[ "${KEEP_BRANCH:-}" == "1" ]]; then
    log "KEEP_BRANCH=1 — branch '$BRANCH_NAME' left in place (delete it manually)"
    return
  fi
  log "deleting branch '$BRANCH_NAME'"
  supabase "${BRANCH_ARGS[@]}" branches delete "$BRANCH_NAME" >/dev/null 2>&1 \
    || warn "branch delete failed — remove '$BRANCH_NAME' from the dashboard"
}
trap cleanup EXIT

log "creating disposable branch '$BRANCH_NAME'"
# -o env saves whatever credentials the CLI emits; the canonical fetch happens
# via `branches get` below once the branch is active.
supabase "${BRANCH_ARGS[@]}" branches create "$BRANCH_NAME" --yes -o env > "$ENV_OUT" \
  || die "branch creation failed"

log "waiting for the branch to become active"
ready=""
for _ in $(seq 1 36); do
  status="$(supabase "${BRANCH_ARGS[@]}" branches list -o json 2>/dev/null \
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
if ! supabase "${BRANCH_ARGS[@]}" branches get "$BRANCH_NAME" -o env > "$ENV_OUT" 2>/dev/null; then
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
supabase "${BRANCH_ARGS[@]}" db push --db-url "$DB" --include-all --yes

log "running SQL integration suite"
psql "$DB" -X -v ON_ERROR_STOP=1 -f "$REPO_ROOT/supabase/tests/settlement_effects.test.sql"

log "all SQL integration tests passed"
