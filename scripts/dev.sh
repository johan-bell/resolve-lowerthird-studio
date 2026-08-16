#!/usr/bin/env bash
# =============================================================================
# Resolve Lower-Third Studio — start everything
#
# One command: resolves pnpm, installs anything missing, builds the shared
# contract, brings the API up FIRST, then starts the UI once the API actually
# answers. Starting them together is what produces the ECONNREFUSED proxy
# errors — the UI boots faster than NestJS compiles.
#
# Usage:
#   ./scripts/dev.sh            start normally
#   ./scripts/dev.sh --fresh    delete the local database first
# =============================================================================
set -Eeuo pipefail

# Job control: each background job becomes its own process group, so Ctrl-C can
# take a whole tree down. Without this, killing the pnpm wrapper orphans the
# nest and vite processes and leaves the ports occupied.
set -m

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

log()  { printf '\033[1;36m[dev]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[dev]\033[0m %s\n' "$*"; }
fail() { printf '\033[1;31m[dev] ERROR:\033[0m %s\n' "$*" >&2; exit 1; }

FRESH=0
for arg in "$@"; do
  case "$arg" in
    --fresh) FRESH=1 ;;
    -h|--help) sed -n '2,14p' "$0"; exit 0 ;;
    *) fail "Unknown option: $arg (try --fresh)" ;;
  esac
done

# ----------------------------------------------------------------- toolchain --
[ -x "$HOME/.npm-global/bin/pnpm" ] && export PATH="$HOME/.npm-global/bin:$PATH"
command -v pnpm >/dev/null 2>&1 || fail "pnpm not found — run ./scripts/setup.sh first"
[ -d node_modules ] || fail "Dependencies missing — run ./scripts/setup.sh first"

PORT="$(grep -E '^PORT=' apps/backend/.env 2>/dev/null | cut -d= -f2 | tr -d '[:space:]')"
PORT="${PORT:-3000}"
API="http://localhost:$PORT/api/health"

# --------------------------------------------------------------- preflight ---
if [ "$FRESH" -eq 1 ]; then
  log "Removing the local database"
  rm -f apps/backend/data/app.sqlite
fi

# Picks up any dependency added since the last run; a no-op when already current.
log "Checking dependencies"
pnpm install --silent

# The apps import the shared package's build output, not its source.
log "Building @lower-thirds/shared"
pnpm --filter @lower-thirds/shared build >/dev/null

# ------------------------------------------------------------------ backend ---
# Kill a whole process group, falling back to the single process.
stop_tree() {
  local pid="$1"
  [ -n "$pid" ] || return 0
  # INT first so the dev servers exit the way Ctrl-C would; pnpm reports a
  # SIGTERM as a run failure, which reads like something broke when it didn't.
  kill -INT -- -"$pid" 2>/dev/null || kill -INT "$pid" 2>/dev/null || true
  for _ in 1 2 3 4 5 6; do
    kill -0 -- -"$pid" 2>/dev/null || return 0
    sleep 0.25
  done
  kill -- -"$pid" 2>/dev/null || kill "$pid" 2>/dev/null || true
}

cleanup() {
  trap - INT TERM EXIT
  printf '\n'
  log "Shutting down"
  stop_tree "${FRONTEND_PID:-}"
  stop_tree "${BACKEND_PID:-}"
  exit 0
}
trap cleanup INT TERM EXIT

log "Starting the API on port $PORT"
pnpm --filter @lower-thirds/backend dev &
BACKEND_PID=$!

log "Waiting for the API to answer…"
READY=0
for _ in $(seq 1 90); do
  if curl -sf -o /dev/null --max-time 1 "$API" 2>/dev/null; then
    READY=1
    break
  fi
  if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
    fail "The API exited during startup — scroll up for the compiler error."
  fi
  sleep 1
done

if [ "$READY" -eq 1 ]; then
  log "API is up"
else
  warn "API did not answer within 90s — starting the UI anyway."
fi

# ----------------------------------------------------------------- frontend ---
# Vite pre-bundles @lower-thirds/shared and caches the result keyed on the
# dependency list, not its contents. We rebuild that package on every start, so
# the cache is stale by definition — and a stale cache means the browser
# silently runs an older build of the shared code while the source on disk looks
# correct. Dropping it costs about a second and removes a whole class of
# "my change isn't showing" confusion.
if [ -d apps/frontend/node_modules/.vite ]; then
  log "Clearing Vite's pre-bundle cache"
  rm -rf apps/frontend/node_modules/.vite
fi

log "Starting the UI — open http://localhost:5173"
pnpm --filter @lower-thirds/frontend dev &
FRONTEND_PID=$!

# Hold here until the UI stops (or Ctrl-C fires the trap).
wait "$FRONTEND_PID"
cleanup
