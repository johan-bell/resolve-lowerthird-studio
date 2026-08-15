#!/usr/bin/env bash
# =============================================================================
# Resolve Lower-Third Studio — development pipeline
# Runs shared (tsc --watch), backend (nest --watch) and frontend (Vite HMR)
# in parallel via pnpm. Ctrl-C stops all three.
#
# Usage:  ./scripts/dev.sh
# =============================================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# setup.sh may have installed pnpm into a user-owned npm prefix.
[ -x "$HOME/.npm-global/bin/pnpm" ] && export PATH="$HOME/.npm-global/bin:$PATH"

command -v pnpm >/dev/null 2>&1 || { echo "pnpm not found — run ./scripts/setup.sh first" >&2; exit 1; }
[ -d node_modules ] || { echo "Dependencies missing — run ./scripts/setup.sh first" >&2; exit 1; }

# Ensure the shared package has an initial build so cold starts type-resolve.
[ -d packages/shared/dist ] || pnpm --filter @lower-thirds/shared build

exec pnpm --parallel --filter "@lower-thirds/*" dev
