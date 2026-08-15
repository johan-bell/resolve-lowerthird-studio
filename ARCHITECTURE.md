# Resolve Lower-Third Studio — Monorepo Architecture

A local macOS desktop tool that builds, previews, and pushes lower-thirds into DaVinci Resolve Studio at the playhead position.

**Stack decisions (locked):** pnpm workspaces · Vue 3 + TS + Tailwind + Vite · NestJS + TypeORM + better-sqlite3 · Python subprocess bridge to the Resolve Scripting API.

---

## 1. Top-level layout

```
resolve-lowerthird-studio/
├── package.json                     # Workspace root — orchestration scripts only, no runtime deps
├── pnpm-workspace.yaml              # Declares apps/* and packages/* as workspace members
├── .npmrc                           # pnpm behavior (hoisting, engine-strict)
├── tsconfig.base.json               # Shared strict TS compiler options, path alias @lower-thirds/shared
├── eslint.config.mjs                # Flat config: TS strict + Vue rules + Prettier interop (whole repo)
├── .prettierrc.json                 # Single source of formatting truth
├── .prettierignore
├── .editorconfig
├── .gitignore
├── README.md
│
├── scripts/
│   ├── setup.sh                     # One-shot bootstrap: scaffolds everything below from a clean clone
│   └── dev.sh                       # Runs backend (watch) + frontend (Vite HMR) in parallel
│
├── packages/
│   └── shared/                      # @lower-thirds/shared — the type contract between FE and BE
│
├── apps/
│   ├── frontend/                    # Vue 3 SPA (Vite) — the builder UI
│   └── backend/                     # NestJS — REST + WebSocket + Resolve orchestration
│
└── python/
    └── resolve_bridge/              # Thin, stateless Python CLI scripts invoked by NestJS
```

**Why this shape:** the FE and BE never redefine the same interface twice — every DTO, entity shape, and WebSocket payload lives once in `packages/shared` and is imported by both sides via the workspace protocol. The Python layer is deliberately outside `apps/` because it is not a service: it is a set of short-lived command scripts owned by the backend's `ResolveModule`.

---

## 2. `packages/shared` — the type contract

```
packages/shared/
├── package.json                     # name: @lower-thirds/shared, exports ./dist + src types
├── tsconfig.json                    # extends ../../tsconfig.base.json
└── src/
    ├── index.ts                     # Barrel export
    ├── constants/
    │   └── defaults.ts              # DEFAULT_STYLE, FONT_FAMILIES whitelist, canvas ratios
    ├── dto/
    │   ├── lower-third-style.dto.ts # name, subtitle, fontFamily, fgHex, bgHex, padding {x,y,min,max}
    │   ├── queue-item.dto.ts        # id, name, title, order, listId
    │   ├── queue-list.dto.ts        # id, label, items[], createdAt
    │   └── push-title.dto.ts        # queueItemId + LowerThirdStyle + trackIndex
    └── types/
        ├── resolve-status.ts        # ResolveConnectionState = 'connected' | 'disconnected' | 'launching' | 'no-project'
        ├── ws-events.ts             # Typed socket event map: 'resolve:status', 'push:progress', 'push:done'
        └── api.ts                   # ApiResult<T> envelope, ImportFormat = 'csv' | 'json'
```

---

## 3. `apps/frontend` — Vue 3 builder UI

```
apps/frontend/
├── index.html
├── package.json
├── vite.config.ts                   # @tailwindcss/vite plugin, /api + /ws proxy → localhost:3000
├── tsconfig.json                    # extends base; vue-tsc for template type-checking
├── .env.development                 # VITE_API_URL, VITE_WS_URL
└── src/
    ├── main.ts                      # createApp + Pinia
    ├── App.vue                      # Dark shell: top bar / three-pane workspace grid
    ├── assets/
    │   └── styles/main.css          # @import "tailwindcss"; @theme tokens (editor-dark palette)
    │
    ├── api/                         # Typed HTTP layer — the ONLY place fetch happens
    │   ├── http.ts                  # Thin fetch wrapper returning ApiResult<T>, error normalization
    │   ├── resolve.api.ts           # GET /resolve/status, POST /resolve/push
    │   ├── queue.api.ts             # CRUD lists/items, POST /queue/import (csv|json), GET /queue/export
    │   └── presets.api.ts           # CRUD style presets & color configurations
    │
    ├── ws/
    │   └── socket.ts                # socket.io-client singleton, typed with ws-events.ts
    │
    ├── stores/                      # Pinia — app state, no business rendering logic
    │   ├── connection.store.ts      # Live link state fed by WS 'resolve:status'
    │   ├── queue.store.ts           # Lists, items, active selection
    │   └── style.store.ts           # Working style + dirty-state vs saved preset
    │
    ├── composables/                 # Logic units consumed by components
    │   ├── useResolveStatus.ts      # Subscribes socket → connection.store, exposes reconnect()
    │   ├── useQueueImport.ts        # File → parse (csv/json) → validate → POST
    │   ├── useAutoScale.ts          # Pure: (text, font, padding) → box width/height for preview
    │   └── usePushToTimeline.ts     # Fires push, tracks per-item progress via WS
    │
    ├── components/
    │   ├── layout/
    │   │   ├── TopBar.vue           # App title, project name, LiveLinkIndicator slot
    │   │   └── LiveLinkIndicator.vue# Pulsing dot + label: Connected / Resolve not running / No project
    │   ├── queue/
    │   │   ├── QueuePanel.vue       # Left pane: list selector, search, import/export buttons
    │   │   ├── QueueTable.vue       # Rows of name/title, drag-order, active-row highlight
    │   │   └── ImportDialog.vue     # CSV/JSON dropzone with column-mapping preview
    │   ├── studio/
    │   │   ├── StylePanel.vue       # Right pane: form sections (identity, type, color, padding)
    │   │   ├── TextFields.vue       # Name + subtitle inputs
    │   │   ├── FontPicker.vue       # Font family select (system font list from backend)
    │   │   ├── ColorField.vue       # Hex input + swatch + eyedropper, validates #RRGGBB
    │   │   ├── PaddingControls.vue  # X/Y sliders with min/max constraint handles
    │   │   └── PresetBar.vue        # Save / load / delete named presets
    │   └── preview/
    │       ├── PreviewCanvas.vue    # 16:9 stage with title-safe overlay
    │       └── LowerThirdMock.vue   # The auto-scaling element — measures text, animates width
    │
    ├── views/
    │   └── BuilderView.vue          # Composes the three panes; sole route
    │
    └── utils/
        ├── color.ts                 # hex validation, contrast ratio for legibility warning
        └── csv.ts                   # RFC-4180 parse/serialize for import/export
```

**Preview logic placement:** `useAutoScale.ts` is a pure function of `(text, fontFamily, fontSize, padding)` so the exact same math can later be mirrored in `insert_title.py` when computing Text+ background size — one algorithm, two consumers.

---

## 4. `apps/backend` — NestJS orchestration

```
apps/backend/
├── package.json
├── nest-cli.json
├── tsconfig.json                    # extends base
├── tsconfig.build.json
├── .env.example                     # PORT, DB_PATH, PYTHON_BIN, RESOLVE_* script paths, POLL_MS
├── data/                            # (gitignored) app.sqlite lives here
└── src/
    ├── main.ts                      # Bootstrap: ValidationPipe (whitelist+transform), CORS for Vite origin
    ├── app.module.ts                # Imports Config, Database, Resolve, Queue, Presets modules
    │
    ├── config/
    │   ├── configuration.ts         # Typed env loading (zod-style validation of process.env)
    │   └── typeorm.config.ts        # better-sqlite3 driver, entities, synchronize in dev, migrations in prod
    │
    ├── common/
    │   ├── filters/api-exception.filter.ts    # Uniform ApiResult error envelope
    │   └── interceptors/api-result.interceptor.ts
    │
    └── modules/
        ├── resolve/                 # ← Integration boundary. Nothing else touches Python.
        │   ├── resolve.module.ts
        │   ├── resolve.controller.ts        # GET /resolve/status, GET /resolve/fonts, POST /resolve/push
        │   ├── resolve.service.ts           # Business ops: getStatus(), pushTitle(dto)
        │   ├── python-runner.service.ts     # spawn() wrapper: timeout, JSON-over-stdout protocol, stderr capture
        │   ├── status-poller.service.ts     # Interval poll of status.py → diffs → emits to gateway
        │   ├── resolve.gateway.ts           # Socket.io gateway: pushes 'resolve:status', 'push:progress'
        │   └── dto/push-title.dto.ts        # class-validator mirror of shared PushTitleDto
        │
        ├── queue/
        │   ├── queue.module.ts
        │   ├── queue.controller.ts          # CRUD + POST /queue/import + GET /queue/:listId/export
        │   ├── queue.service.ts
        │   ├── import-export.service.ts     # CSV/JSON parsing & serialization, row validation report
        │   ├── entities/
        │   │   ├── queue-list.entity.ts
        │   │   └── queue-item.entity.ts     # FK → list, order column
        │   └── dto/ (create-list, update-item, import-payload)
        │
        └── presets/
            ├── presets.module.ts
            ├── presets.controller.ts
            ├── presets.service.ts
            ├── entities/
            │   ├── style-preset.entity.ts   # name, fontFamily, fgHex, bgHex, embedded padding JSON
            │   └── color-config.entity.ts   # named brand palettes
            └── dto/ (create-preset, update-preset)
```

**Live Link design:** `StatusPollerService` runs `status.py` every `POLL_MS` (default 3000 ms) via `PythonRunnerService`, compares against the last known `ResolveConnectionState`, and only on change emits `resolve:status` through `ResolveGateway`. The frontend indicator is therefore push-based and cheap; a REST `GET /resolve/status` exists for the initial paint.

**Push flow:** `POST /resolve/push` → validate DTO → `python-runner` spawns `insert_title.py --payload '<json>'` → script returns `{ok, timecode, trackIndex}` on stdout → gateway emits `push:done`. Failures (Resolve closed mid-push, no timeline) come back as typed error codes, never raw tracebacks.

---

## 5. `python/` — the Resolve bridge

```
python/
├── requirements.txt                 # stdlib-only today; pinned here for future needs
└── resolve_bridge/
    ├── __init__.py
    ├── _resolve.py                  # Locates DaVinciResolveScript on macOS (RESOLVE_SCRIPT_API/LIB
    │                                #   or default /Library/Application Support/... paths), returns
    │                                #   resolve handle or a typed error dict
    ├── status.py                    # CLI → JSON: {state, projectName, timelineName, playhead}
    ├── fonts.py                     # CLI → JSON: system font family list (via Text+ inspection / CoreText)
    └── insert_title.py              # CLI: reads style+text payload JSON, ensures track, creates Text+
                                     #   via InsertTitleIntoTrack at current playhead, applies
                                     #   font/colors/background padding on the Fusion comp, prints result JSON
```

**Protocol:** every script is stateless, takes JSON in (argv or stdin), prints exactly one JSON object to stdout, exits 0/1. That single convention makes `PythonRunnerService` trivial and testable with a mock script.

---

## 6. Dependency graph

```
frontend ──imports──▶ @lower-thirds/shared ◀──imports── backend
frontend ──HTTP/WS──▶ backend ──spawn──▶ python/resolve_bridge ──fusionscript──▶ DaVinci Resolve
```

Root `package.json` scripts: `pnpm dev` (both apps in parallel), `pnpm build` (shared → backend → frontend), `pnpm lint`, `pnpm format`, `pnpm typecheck`.
