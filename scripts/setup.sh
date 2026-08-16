#!/usr/bin/env bash
# =============================================================================
# Resolve Lower-Third Studio — monorepo bootstrap
#
# Deterministic by design: every file is written by this script, so the only
# step that touches the network is a single `pnpm install`. No interactive
# scaffolders, no code generators, nothing that can prompt or stall.
#
# Idempotent: safe to re-run at any time. Generated config is refreshed,
# node_modules / venv work is skipped when already present.
#
# Usage:  ./scripts/setup.sh
# =============================================================================
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

log()  { printf '\033[1;36m[setup]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[setup] WARN:\033[0m %s\n' "$*"; }
fail() { printf '\033[1;31m[setup] ERROR:\033[0m %s\n' "$*" >&2; exit 1; }

# Writes a heredoc to $1 only when the file does not already exist. Used for
# everything under src/: config is refreshed on every run, source is not, so a
# re-run can never overwrite work in progress.
write_if_absent() {
  local target="$1"
  if [ -e "$target" ]; then
    cat > /dev/null
    return 0
  fi
  mkdir -p "$(dirname "$target")"
  cat > "$target"
}
trap 'printf "\033[1;31m[setup] FAILED at line %d — see message above.\033[0m\n" "$LINENO" >&2' ERR

# =============================================================================
# 0. Preflight
# =============================================================================
command -v node >/dev/null 2>&1 || fail "Node.js is required (>= 20). Install from https://nodejs.org"
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
[ "$NODE_MAJOR" -ge 20 ] || fail "Node >= 20 required, found $(node --version)."
command -v python3 >/dev/null 2>&1 || fail "python3 is required for the Resolve bridge."

# pnpm resolution: PATH → user prefix from a previous run → corepack → npm
# global → npm into a user-owned prefix (no sudo, survives a locked /usr/local).
USER_NPM_PREFIX="$HOME/.npm-global"
[ -x "$USER_NPM_PREFIX/bin/pnpm" ] && export PATH="$USER_NPM_PREFIX/bin:$PATH"

persist_path_line() {
  local rc=''
  case "${SHELL:-}" in
    */zsh)  rc="$HOME/.zshrc" ;;
    */bash) rc="$HOME/.bash_profile" ;;
  esac
  [ -n "$rc" ] || return 0
  if [ ! -f "$rc" ] || ! grep -qF '.npm-global/bin' "$rc" 2>/dev/null; then
    {
      printf '\n# Added by resolve-lowerthird-studio setup.sh\n'
      printf '%s\n' 'export PATH="$HOME/.npm-global/bin:$PATH"'
    } >> "$rc"
    log "Added ~/.npm-global/bin to PATH in $rc"
  fi
}

if ! command -v pnpm >/dev/null 2>&1 && command -v corepack >/dev/null 2>&1; then
  log "pnpm not found — trying corepack"
  corepack enable >/dev/null 2>&1 && corepack prepare pnpm@latest --activate >/dev/null 2>&1 || true
  hash -r
fi

if ! command -v pnpm >/dev/null 2>&1; then
  command -v npm >/dev/null 2>&1 || fail "No pnpm, corepack or npm found. See https://pnpm.io/installation"
  log "pnpm not found — trying a global npm install"
  if npm install -g pnpm >/dev/null 2>&1; then
    hash -r
  else
    log "Global prefix not writable — installing pnpm into $USER_NPM_PREFIX instead"
    mkdir -p "$USER_NPM_PREFIX"
    npm install -g pnpm --prefix "$USER_NPM_PREFIX" \
      || fail "Could not install pnpm. Install manually then re-run: https://pnpm.io/installation"
    export PATH="$USER_NPM_PREFIX/bin:$PATH"
    hash -r
    persist_path_line
  fi
fi

command -v pnpm >/dev/null 2>&1 \
  || fail "pnpm installed but not on PATH — open a NEW terminal and re-run ./scripts/setup.sh"
log "node $(node --version) · pnpm $(pnpm --version) · $(python3 --version)"

mkdir -p apps packages scripts python/resolve_bridge

# =============================================================================
# 1. Workspace root
# =============================================================================
log "Writing workspace root configuration"

# pnpm-workspace.yaml holds workspace settings. The build-allowlist key differs
# by version: pnpm >= 11 reads `allowBuilds`, pnpm 10 reads
# `onlyBuiltDependencies` — write both. Any other keys already in the file
# (e.g. minimumReleaseAgeExclude, which pnpm writes itself) are preserved.
node - <<'NODE'
const fs = require('fs');
const FILE = 'pnpm-workspace.yaml';
const MANAGED_KEYS = new Set(['packages', 'allowBuilds', 'onlyBuiltDependencies']);
const MANAGED_COMMENTS = ['# Native/postinstall builds', '# allowBuilds is read by'];

const existing = fs.existsSync(FILE) ? fs.readFileSync(FILE, 'utf8') : '';
const kept = [];
let skipping = false;
for (const line of existing.split('\n')) {
  const topLevelKey = /^([A-Za-z0-9_"@/-]+):/.exec(line);
  if (topLevelKey) skipping = MANAGED_KEYS.has(topLevelKey[1]);
  if (skipping) continue;
  if (MANAGED_COMMENTS.some((c) => line.startsWith(c))) continue;
  kept.push(line);
}
const preserved = kept.join('\n').replace(/\n{3,}/g, '\n\n').trim();

const managed = [
  'packages:',
  '  - "apps/*"',
  '  - "packages/*"',
  '',
  '# Native/postinstall builds we explicitly trust.',
  '# allowBuilds is read by pnpm >= 11, onlyBuiltDependencies by pnpm 10.',
  'allowBuilds:',
  '  better-sqlite3: true',
  '  ffmpeg-static: true',
  '  esbuild: true',
  '  "@swc/core": true',
  '  unrs-resolver: true',
  '',
  'onlyBuiltDependencies:',
  '  - better-sqlite3',
  '  - ffmpeg-static',
  '  - esbuild',
  '  - "@swc/core"',
  '  - unrs-resolver',
].join('\n');

fs.writeFileSync(FILE, managed + (preserved ? '\n\n' + preserved : '') + '\n');
NODE

cat > .npmrc <<'EOF'
engine-strict=true
shamefully-hoist=false
strict-peer-dependencies=false
EOF

write_if_absent package.json <<'EOF'
{
  "name": "resolve-lowerthird-studio",
  "version": "0.1.0",
  "private": true,
  "engines": { "node": ">=20" },
  "scripts": {
    "dev": "pnpm --parallel --filter \"@lower-thirds/*\" dev",
    "build": "pnpm --filter @lower-thirds/shared build && pnpm --filter @lower-thirds/backend build && pnpm --filter @lower-thirds/frontend build",
    "lint": "eslint .",
    "format": "prettier --write .",
    "typecheck": "pnpm -r typecheck"
  },
  "devDependencies": {
    "@eslint/js": "^10.0.1",
    "eslint": "^10.8.1",
    "eslint-config-prettier": "^10.1.8",
    "eslint-plugin-vue": "^10.10.0",
    "prettier": "^3.9.6",
    "typescript": "^5.9.3",
    "typescript-eslint": "^8.46.0"
  }
}
EOF

cat > tsconfig.base.json <<'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "moduleResolution": "bundler",
    "module": "ESNext",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "sourceMap": true
  }
}
EOF

cat > .prettierrc.json <<'EOF'
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2
}
EOF

cat > .prettierignore <<'EOF'
dist
node_modules
pnpm-lock.yaml
apps/backend/data
python/.venv
EOF

cat > .editorconfig <<'EOF'
root = true

[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 2
insert_final_newline = true
trim_trailing_whitespace = true

[*.py]
indent_size = 4
EOF

cat > .gitignore <<'EOF'
node_modules/
dist/
*.local
.env
apps/backend/data/
renders/
_to_delete/
.pnpm-install.log
python/.venv/
__pycache__/
.DS_Store
setup.log
EOF

cat > eslint.config.mjs <<'EOF'
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import pluginVue from 'eslint-plugin-vue';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      'python/**',
      'apps/backend/data/**',
      'eslint.config.mjs',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    languageOptions: { parserOptions: { parser: tseslint.parser } },
  },
  {
    // TypeScript already resolves globals (DOM lib, Node types) far more
    // accurately than ESLint's static list, so no-undef only produces false
    // positives here. This is the rule typescript-eslint recommends.
    files: ['**/*.ts', '**/*.tsx', '**/*.vue', '**/*.mts'],
    rules: { 'no-undef': 'off' },
  },
  prettier,
);
EOF

# =============================================================================
# 2. packages/shared — the FE/BE type contract
# =============================================================================
log "Writing @lower-thirds/shared"
mkdir -p packages/shared/src/{dto,types,constants}

# Emits CommonJS so the NestJS backend can require it natively; Vite pre-bundles
# it for the browser via optimizeDeps.include (see apps/frontend/vite.config.ts).
write_if_absent packages/shared/package.json <<'EOF'
{
  "name": "@lower-thirds/shared",
  "version": "0.1.0",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "dev": "tsc --watch --preserveWatchOutput",
    "build": "tsc",
    "typecheck": "tsc --noEmit"
  }
}
EOF

cat > packages/shared/tsconfig.json <<'EOF'
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "CommonJS",
    "moduleResolution": "Node",
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true
  },
  "include": ["src"]
}
EOF

write_if_absent packages/shared/src/index.ts <<'EOF'
export * from './types/resolve-status';
export * from './types/ws-events';
export * from './types/api';
export * from './dto/lower-third-style.dto';
export * from './dto/queue-item.dto';
export * from './dto/push-title.dto';
export * from './constants/defaults';
EOF

write_if_absent packages/shared/src/types/resolve-status.ts <<'EOF'
/** Lifecycle of the link between this app and DaVinci Resolve. */
export type ResolveConnectionState =
  | 'connected' // Resolve running, project + timeline open
  | 'no-project' // Resolve running, but nothing open to push into
  | 'launching' // Handshake in progress
  | 'disconnected'; // Resolve not running or scripting API unreachable

export interface ResolveStatus {
  state: ResolveConnectionState;
  projectName: string | null;
  timelineName: string | null;
  /** Playhead as timecode, e.g. "01:00:12:04". */
  playhead: string | null;
  /** Populated when state is 'disconnected' and a reason is known. */
  detail: string | null;
}
EOF

write_if_absent packages/shared/src/types/ws-events.ts <<'EOF'
import type { ResolveStatus } from './resolve-status';

export interface PushProgressPayload {
  queueItemId: string;
  step: 'validating' | 'locating-timeline' | 'inserting' | 'styling';
}

export interface PushDonePayload {
  queueItemId: string;
  ok: boolean;
  timecode: string | null;
  error: string | null;
}

export interface ServerToClientEvents {
  'resolve:status': (status: ResolveStatus) => void;
  'push:progress': (payload: PushProgressPayload) => void;
  'push:done': (payload: PushDonePayload) => void;
}

export interface ClientToServerEvents {
  'resolve:refresh': () => void;
}
EOF

write_if_absent packages/shared/src/types/api.ts <<'EOF'
export interface ApiError {
  code: string;
  message: string;
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };

export type ImportFormat = 'csv' | 'json';
EOF

write_if_absent packages/shared/src/dto/lower-third-style.dto.ts <<'EOF'
/** Box-sizing rules the auto-scaling preview and the Fusion comp both obey. */
export interface PaddingConstraints {
  /** Horizontal padding either side of the text, in project pixels. */
  x: number;
  /** Vertical padding above and below the text block, in project pixels. */
  y: number;
  /** Background never shrinks below this width. */
  minWidth: number;
  /** Background never grows past this width; text wraps instead. */
  maxWidth: number;
}

export interface LowerThirdStyle {
  fontFamily: string;
  fontSize: number;
  subtitleFontSize: number;
  foregroundHex: string;
  backgroundHex: string;
  padding: PaddingConstraints;
}
EOF

write_if_absent packages/shared/src/dto/queue-item.dto.ts <<'EOF'
export interface QueueItem {
  id: string;
  name: string;
  title: string;
  order: number;
  listId: string;
}

export interface QueueList {
  id: string;
  label: string;
  createdAt: string;
  items: QueueItem[];
}
EOF

write_if_absent packages/shared/src/dto/push-title.dto.ts <<'EOF'
import type { LowerThirdStyle } from './lower-third-style.dto';

export interface PushTitleRequest {
  queueItemId: string;
  name: string;
  subtitle: string;
  style: LowerThirdStyle;
  /** Video track to insert into; 1-based, matching the Resolve API. */
  trackIndex: number;
}

export interface PushTitleResult {
  ok: boolean;
  timecode: string | null;
  trackIndex: number;
}
EOF

write_if_absent packages/shared/src/constants/defaults.ts <<'EOF'
import type { LowerThirdStyle } from '../dto/lower-third-style.dto';

export const DEFAULT_STYLE: LowerThirdStyle = {
  fontFamily: 'Helvetica Neue',
  fontSize: 48,
  subtitleFontSize: 30,
  foregroundHex: '#FFFFFF',
  backgroundHex: '#0F1115',
  padding: { x: 32, y: 16, minWidth: 240, maxWidth: 1280 },
};

export const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

export const isHexColor = (value: string): boolean => HEX_COLOR_PATTERN.test(value);
EOF

# =============================================================================
# 3. apps/frontend — Vue 3 + Vite + Tailwind v4
# =============================================================================
log "Writing @lower-thirds/frontend"

# An earlier version of this script used `create-vite`. If those artifacts are
# present, clear them so the hand-written config below is the only source of
# truth (stale node_modules is dropped too, since the package name changed).
if [ -f apps/frontend/tsconfig.app.json ] || [ -f apps/frontend/src/style.css ]; then
  log "Removing leftovers from the old create-vite scaffold"
  rm -rf \
    apps/frontend/node_modules \
    apps/frontend/tsconfig.app.json \
    apps/frontend/tsconfig.node.json \
    apps/frontend/src/style.css \
    apps/frontend/src/components \
    apps/frontend/src/assets/vue.svg \
    apps/frontend/public/vite.svg \
    apps/frontend/README.md \
    apps/frontend/.vscode
fi

mkdir -p apps/frontend/src/assets/styles

write_if_absent apps/frontend/package.json <<'EOF'
{
  "name": "@lower-thirds/frontend",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc --noEmit && vite build",
    "preview": "vite preview",
    "typecheck": "vue-tsc --noEmit"
  },
  "dependencies": {
    "@lower-thirds/shared": "workspace:*",
    "@vue/devtools-api": "^8.2.1",
    "pinia": "^4.0.3",
    "socket.io-client": "^4.8.3",
    "vue": "^3.5.41"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.3.3",
    "@vitejs/plugin-vue": "^6.0.8",
    "tailwindcss": "^4.3.3",
    "typescript": "^5.9.3",
    "vite": "^8.2.1",
    "vue-tsc": "^3.3.10"
  }
}
EOF

cat > apps/frontend/tsconfig.json <<'EOF'
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "preserve",
    "noEmit": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "types": ["vite/client"],
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src/**/*.ts", "src/**/*.d.ts", "src/**/*.vue", "vite.config.ts"]
}
EOF

cat > apps/frontend/vite.config.ts <<'EOF'
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  // The shared package emits CommonJS for NestJS; pre-bundle it for the browser.
  optimizeDeps: { include: ['@lower-thirds/shared'] },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
      '/socket.io': { target: 'http://localhost:3000', ws: true },
    },
  },
});
EOF

write_if_absent apps/frontend/index.html <<'EOF'
<!doctype html>
<html lang="en" class="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <!-- Inline so the dev server never 404s on /favicon.ico -->
    <link
      rel="icon"
      href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Crect width='16' height='16' rx='3' fill='%230F1115'/%3E%3Crect x='2' y='9' width='12' height='5' rx='1' fill='%23E8483F'/%3E%3C/svg%3E"
    />
    <title>Lower-Third Studio</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
EOF

write_if_absent apps/frontend/src/vite-env.d.ts <<'EOF'
/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<Record<string, never>, Record<string, never>, unknown>;
  export default component;
}
EOF

write_if_absent apps/frontend/src/assets/styles/main.css <<'EOF'
@import 'tailwindcss';

@theme {
  --color-stage: #0f1115;
  --color-panel: #16181d;
  --color-raised: #1e2128;
  --color-stroke: #2a2e37;
  --color-accent: #e8483f;
  --color-ok: #34d399;
  --color-warn: #fbbf24;
}

html,
body,
#app {
  height: 100%;
}

body {
  margin: 0;
  background-color: var(--color-stage);
  color: #d4d4d8;
  font-family: ui-sans-serif, system-ui, -apple-system, 'Helvetica Neue', sans-serif;
  -webkit-font-smoothing: antialiased;
}
EOF

write_if_absent apps/frontend/src/main.ts <<'EOF'
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import './assets/styles/main.css';

createApp(App).use(createPinia()).mount('#app');
EOF

# Layout shell only — the real panels arrive with the feature modules.
write_if_absent apps/frontend/src/App.vue <<'EOF'
<script setup lang="ts">
import { computed, ref } from 'vue';
import { DEFAULT_STYLE } from '@lower-thirds/shared';
import type { ResolveConnectionState } from '@lower-thirds/shared';

const connectionState = ref<ResolveConnectionState>('disconnected');

const indicator = computed(() => {
  switch (connectionState.value) {
    case 'connected':
      return { label: 'Resolve connected', dot: 'bg-ok' };
    case 'no-project':
      return { label: 'No project open', dot: 'bg-warn' };
    case 'launching':
      return { label: 'Connecting…', dot: 'bg-warn' };
    default:
      return { label: 'Resolve not running', dot: 'bg-zinc-600' };
  }
});
</script>

<template>
  <div class="flex h-full flex-col">
    <header
      class="flex h-12 shrink-0 items-center justify-between border-b border-stroke bg-panel px-4"
    >
      <h1 class="text-sm font-semibold tracking-wide text-zinc-200">
        Lower-Third Studio
        <span class="ml-2 font-normal text-zinc-500">for DaVinci Resolve</span>
      </h1>
      <div class="flex items-center gap-2 text-xs text-zinc-400">
        <span class="h-2 w-2 rounded-full" :class="indicator.dot" />
        {{ indicator.label }}
      </div>
    </header>

    <main class="grid min-h-0 flex-1 grid-cols-[320px_1fr_340px]">
      <section class="min-h-0 overflow-auto border-r border-stroke bg-panel p-3">
        <h2 class="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Queue</h2>
        <p class="text-xs text-zinc-600">Name and title list loads here.</p>
      </section>

      <section class="flex min-h-0 flex-col items-center justify-center bg-stage p-6">
        <div class="aspect-video w-full max-w-3xl rounded border border-stroke bg-black/40">
          <div class="flex h-full items-end p-8">
            <div
              class="rounded px-6 py-3"
              :style="{ backgroundColor: DEFAULT_STYLE.backgroundHex }"
            >
              <div
                class="text-2xl font-semibold"
                :style="{ color: DEFAULT_STYLE.foregroundHex }"
              >
                Preview
              </div>
              <div class="text-sm text-zinc-400">Auto-scaling element</div>
            </div>
          </div>
        </div>
      </section>

      <section class="min-h-0 overflow-auto border-l border-stroke bg-panel p-3">
        <h2 class="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Style</h2>
        <p class="text-xs text-zinc-600">Typography, colour and padding controls load here.</p>
      </section>
    </main>
  </div>
</template>
EOF

# =============================================================================
# 4. apps/backend — NestJS
# =============================================================================
log "Writing @lower-thirds/backend"
mkdir -p apps/backend/src apps/backend/data

write_if_absent apps/backend/package.json <<'EOF'
{
  "name": "@lower-thirds/backend",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "nest start --watch",
    "build": "nest build",
    "start": "node dist/main.js",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@lower-thirds/shared": "workspace:*",
    "@nestjs/common": "^11.2.1",
    "@nestjs/config": "^4.0.4",
    "@nestjs/core": "^11.2.1",
    "@nestjs/platform-express": "^11.2.1",
    "@nestjs/platform-socket.io": "^11.2.1",
    "@nestjs/typeorm": "^11.0.3",
    "@nestjs/websockets": "^11.2.1",
    "@napi-rs/canvas": "^1.0.6",
    "better-sqlite3": "^12.11.1",
    "class-transformer": "^0.5.1",
    "class-validator": "^0.15.1",
    "ffmpeg-static": "^5.3.0",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.2",
    "socket.io": "^4.8.3",
    "typeorm": "^1.1.0"
  },
  "devDependencies": {
    "@nestjs/cli": "^11.0.24",
    "@nestjs/schematics": "^11.1.0",
    "@types/better-sqlite3": "^9.6.0",
    "@types/express": "^5.0.6",
    "@types/node": "^26.2.0",
    "source-map-support": "^0.5.21",
    "ts-loader": "^9.6.2",
    "ts-node": "^10.9.2",
    "tsconfig-paths": "^4.2.0",
    "typescript": "^5.9.3"
  }
}
EOF

cat > apps/backend/nest-cli.json <<'EOF'
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true
  }
}
EOF

# Standalone (does not extend the bundler-resolution base): Nest needs CommonJS
# emit plus decorator metadata.
cat > apps/backend/tsconfig.json <<'EOF'
{
  "compilerOptions": {
    "module": "CommonJS",
    "moduleResolution": "Node",
    "target": "ES2023",
    "lib": ["ES2023"],
    "declaration": false,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "forceConsistentCasingInFileNames": true,
    "strictPropertyInitialization": false,
    "paths": { "@/*": ["src/*"] }
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
EOF

write_if_absent apps/backend/src/main.ts <<'EOF'
import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.enableCors({ origin: ['http://localhost:5173'], credentials: true });

  const port = config.get<number>('PORT') ?? 3000;
  await app.listen(port);
  new Logger('Bootstrap').log(`Lower-Third Studio API listening on http://localhost:${port}/api`);
}

void bootstrap();
EOF

write_if_absent apps/backend/src/app.module.ts <<'EOF'
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health.controller';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' })],
  controllers: [HealthController],
})
export class AppModule {}
EOF

write_if_absent apps/backend/src/health.controller.ts <<'EOF'
import { Controller, Get } from '@nestjs/common';
import type { ApiResult } from '@lower-thirds/shared';

interface HealthPayload {
  status: 'ok';
  service: string;
}

@Controller('health')
export class HealthController {
  @Get()
  check(): ApiResult<HealthPayload> {
    return { ok: true, data: { status: 'ok', service: 'lower-third-studio' } };
  }
}
EOF

cat > apps/backend/.env.example <<'EOF'
PORT=3000
DB_PATH=./data/app.sqlite

# How often the Resolve link is re-checked, and the ceiling on one bridge call.
STATUS_POLL_MS=3000
BRIDGE_TIMEOUT_MS=15000

# Python interpreter and the directory containing the resolve_bridge package.
# Relative paths resolve against apps/backend. Both have working defaults —
# uncomment only to override.
# PYTHON_BIN=../../python/.venv/bin/python3
# RESOLVE_BRIDGE_ROOT=../../python

# macOS DaVinci Resolve Studio scripting paths (defaults for a stock install)
RESOLVE_SCRIPT_API=/Library/Application Support/Blackmagic Design/DaVinci Resolve/Developer/Scripting
RESOLVE_SCRIPT_LIB=/Applications/DaVinci Resolve/DaVinci Resolve.app/Contents/Libraries/Fusion/fusionscript.so

# --- Develop without Resolve -------------------------------------------------
# Point the bridge at the mock instead of a real install. Write one of
# connected / no-project / no-timeline / closed into the state file to change
# what the app sees, live, with no restart.
# RESOLVE_SCRIPT_API=../../python/tests/mock_resolve
# RESOLVE_SCRIPT_LIB=../../python/tests/mock_resolve/fusionscript.so
# MOCK_RESOLVE_STATE_FILE=/tmp/mock-resolve-state.txt
EOF

[ -f apps/backend/.env ] || cp apps/backend/.env.example apps/backend/.env

# =============================================================================
# 5. Python bridge
# =============================================================================
log "Preparing Python bridge"

cat > python/requirements.txt <<'EOF'
# The Resolve bridge is stdlib-only: DaVinciResolveScript ships with DaVinci
# Resolve itself and is located at runtime via RESOLVE_SCRIPT_API/LIB.
# Pin any future third-party dependencies here.
EOF

[ -f python/resolve_bridge/__init__.py ] || : > python/resolve_bridge/__init__.py

# The bridge checks that the scripting library exists before importing it. The
# mock needs a stub at that path so it can stand in for a real Resolve install.
mkdir -p python/tests/mock_resolve
[ -f python/tests/mock_resolve/fusionscript.so ] || : > python/tests/mock_resolve/fusionscript.so

if [ -d python/.venv ]; then
  log "Python venv already present — skipping"
else
  python3 -m venv python/.venv || fail "Could not create the Python venv."
  python/.venv/bin/python3 -m pip install --quiet --upgrade pip >/dev/null 2>&1 \
    || warn "pip self-upgrade failed — continuing (not fatal)."
fi

# =============================================================================
# 6. Install + first build
# =============================================================================
log "Installing workspace dependencies (this is the only network step)"

# pnpm >= 11 refuses lockfile entries published inside its minimumReleaseAge
# window — a supply-chain guard against freshly-compromised releases. When a
# dependency we already depend on trips it, record a targeted exception for
# that exact version and retry, rather than weakening the policy globally.
INSTALL_LOG="$ROOT_DIR/.pnpm-install.log"
allow_recent_releases() {
  node - "$INSTALL_LOG" <<'NODE'
const fs = require('fs');
const log = fs.readFileSync(process.argv[2], 'utf8');
const FILE = 'pnpm-workspace.yaml';

// Lines read: "  vue-tsc@3.3.10 was published at <date>, within the ... cutoff"
const flagged = [...log.matchAll(/^\s*(\S+@[0-9][^\s]*)\s+was published at/gm)].map((m) => m[1]);
if (flagged.length === 0) process.exit(1);

const yaml = fs.readFileSync(FILE, 'utf8');
const existing = new Set(
  [...yaml.matchAll(/^\s+-\s+'?([^'\s]+)'?\s*$/gm)].map((m) => m[1]),
);
const fresh = flagged.filter((entry) => !existing.has(entry));
if (fresh.length === 0) process.exit(1);

const lines = fresh.map((entry) => `  - '${entry}'`).join('\n');
const out = /^minimumReleaseAgeExclude:/m.test(yaml)
  ? yaml.replace(/^minimumReleaseAgeExclude:$/m, `minimumReleaseAgeExclude:\n${lines}`)
  : `${yaml.trimEnd()}\n\n# Versions we accept despite being newer than the release-age policy.\nminimumReleaseAgeExclude:\n${lines}\n`;
fs.writeFileSync(FILE, out);
console.log(fresh.join(' '));
NODE
}

if ! pnpm install 2>&1 | tee "$INSTALL_LOG"; then
  if grep -q "MINIMUM_RELEASE_AGE_VIOLATION" "$INSTALL_LOG"; then
    ADDED="$(allow_recent_releases || true)"
    if [ -n "$ADDED" ]; then
      log "Allowing recently-published versions: $ADDED"
      pnpm install 2>&1 | tee "$INSTALL_LOG"
    else
      fail "pnpm rejected the lockfile and no exception could be derived. See $INSTALL_LOG"
    fi
  else
    fail "pnpm install failed. See $INSTALL_LOG"
  fi
fi
rm -f "$INSTALL_LOG"

log "Verifying the better-sqlite3 native binding"
if ( cd apps/backend && node -e "require('better-sqlite3')" ) >/dev/null 2>&1; then
  log "better-sqlite3 loads correctly"
else
  log "Native binding missing — rebuilding better-sqlite3"
  pnpm rebuild better-sqlite3 >/dev/null 2>&1 || true
  if ( cd apps/backend && node -e "require('better-sqlite3')" ) >/dev/null 2>&1; then
    log "better-sqlite3 loads correctly"
  else
    warn "better-sqlite3 could not be built. The app still runs — nothing uses"
    warn "the database yet — but this must be fixed before the queue/presets"
    warn "modules land. Most likely cause on macOS: Xcode Command Line Tools"
    warn "are missing. Fix with:  xcode-select --install   then re-run setup."
  fi
fi

log "Building @lower-thirds/shared so both apps resolve its types"
pnpm --filter @lower-thirds/shared build

# =============================================================================
log ""
log "Setup complete."
log "  Start both dev servers:  ./scripts/dev.sh"
log "  Frontend  http://localhost:5173"
log "  Backend   http://localhost:3000/api/health"
