# Lower-Third Studio

A local desktop tool for building animated lower-thirds and batch-rendering them
as **ProRes 4444 with a real alpha channel** — one file per name, ready to drop
onto a timeline in DaVinci Resolve, Premiere or Final Cut.

Feed it a list of names and titles, pick a look, and it renders the whole queue
while you do something else.

---

## What it does

- **Queue manager** — import names from CSV or JSON, or type them in. Export back out.
- **Six layouts** — solid bar, accent stripe, two-tone, minimal, underline, offset block.
- **Style studio** — font, weight, sizes, foreground/background/accent colours,
  corner radius, padding and box width limits. Every section has a one-click revert.
- **Free positioning** — a nine-point anchor grid, margin sliders, or just drag the
  lower-third around the preview.
- **Live preview** — plays the actual wipe animation, drawn by the same code that
  renders the final file, so what you see is what you get.
- **Batch render** — every entry in the queue to ProRes 4444 with alpha, with
  per-file progress.
- **Live Resolve link** — a status indicator showing whether DaVinci Resolve is
  running and which project and timeline are open. (Requires Resolve Studio — see below.)

---

## Requirements

| | |
|---|---|
| macOS | Built and tested on macOS; the Python bridge assumes macOS paths |
| Node.js | 20 or newer |
| Python | 3.9 or newer (macOS ships 3.9) |
| DaVinci Resolve | **Optional.** Only needed for the live link — see [Using it with DaVinci Resolve](#using-it-with-davinci-resolve) |

`pnpm` and `ffmpeg` are installed automatically — you don't need Homebrew.

---

## Quick start

```bash
git clone https://github.com/johan-bell/resolve-lowerthird-studio.git
cd resolve-lowerthird-studio
./scripts/setup.sh     # one-time: installs everything
./scripts/dev.sh       # start the app
```

Then open **http://localhost:5173**.

`dev.sh` brings the API up first and waits until it answers before starting the
UI, so you won't see connection errors on boot. Press `Ctrl-C` to stop both.

```bash
./scripts/dev.sh --fresh   # start with a clean database
```

Rendered files land in `renders/` in the project folder.

---

## Using it with DaVinci Resolve

There are two separate things here: **importing the rendered files** (works with
any version of Resolve, and any other editor), and **the live link** (needs
Resolve Studio).

### Importing a rendered lower-third — works in free Resolve

1. Render from the app — files appear in `renders/`.
2. Drag the `.mov` into your Resolve **Media Pool**.
3. Drop it on a video track **above** your footage.

The alpha channel is picked up automatically; the background stays transparent.
If you ever see a dark fringe around the text, that's the alpha interpretation
setting — these files use **straight (unpremultiplied)** alpha. Right-click the
clip in the Media Pool → *Clip Attributes* → *Alpha mode*.

Because the animation is baked into the file, changing the timing means
re-rendering from the app rather than adjusting keyframes in Resolve.

### The live link — requires DaVinci Resolve Studio

The indicator in the top-right shows whether Resolve is running and what's open.
It uses Resolve's Python scripting API, which is **only available in DaVinci
Resolve Studio** — the free version can run scripts from its own console but
cannot be driven from an outside application.

To enable it:

1. Open **DaVinci Resolve Studio**.
2. Go to **Preferences → System → General**.
3. Set **External scripting using** to **Local**.
4. Restart Resolve, then restart this app.

The indicator turns green within about three seconds of Resolve opening a
timeline, and shows the project name, timeline name and current playhead
timecode. Click it to force a re-check.

If your Resolve is installed somewhere non-standard, set the paths in
`apps/backend/.env`:

```bash
RESOLVE_SCRIPT_API="/Library/Application Support/Blackmagic Design/DaVinci Resolve/Developer/Scripting"
RESOLVE_SCRIPT_LIB="/Applications/DaVinci Resolve/DaVinci Resolve.app/Contents/Libraries/Fusion/fusionscript.so"
```

You can check the bridge on its own without the app running:

```bash
cd python && python3 -m resolve_bridge.status
```

It always prints one JSON object — `state` will be `connected`, `no-project` or
`disconnected`, with a `detail` explaining why.

### Developing without Resolve installed

A mock Resolve ships with the project, so the whole app runs — including a green
link indicator — with no Resolve on the machine. Add this to `apps/backend/.env`:

```bash
RESOLVE_SCRIPT_API=../../python/tests/mock_resolve
RESOLVE_SCRIPT_LIB=../../python/tests/mock_resolve/fusionscript.so
MOCK_RESOLVE_STATE_FILE=/tmp/mock-resolve-state.txt
```

Then write a state into that file at any time — no restart needed:

```bash
echo connected  > /tmp/mock-resolve-state.txt   # project + timeline open
echo no-project > /tmp/mock-resolve-state.txt   # Resolve running, nothing open
echo closed     > /tmp/mock-resolve-state.txt   # Resolve not running
```

---

## Importing names

CSV with a header row:

```csv
name,title
Johan Bell,Director
Ava Nkosi,Director of Photography
```

The importer accepts several header names for each column — `name`, `speaker`,
`guest` for the first, and `title`, `role`, `position`, `job title` for the
second. Quoted fields containing commas work as expected. Rows without a name
are skipped and reported rather than silently dropped.

JSON works too, either a bare array or `{ "items": [...] }`.

---

## Project layout

```
apps/frontend      Vue 3 + Vite + Tailwind — the UI
apps/backend       NestJS — queue, presets, rendering, Resolve bridge
packages/shared    Types, layout maths and animation shared by both
python/            Stateless Python scripts that talk to Resolve
scripts/           setup.sh and dev.sh
renders/           Rendered output (git-ignored)
```

One detail worth knowing: **layout and animation live in `packages/shared`** and
are used unchanged by the browser preview and the offline renderer. Both draw
from the same plan through the same routine, so the preview cannot drift from
the exported file.

See [ARCHITECTURE.md](ARCHITECTURE.md) for a fuller tour.

---

## Useful commands

```bash
./scripts/dev.sh            start everything
./scripts/dev.sh --fresh    start with a clean database
pnpm build                  type-check and build all packages
pnpm lint                   lint everything
pnpm format                 format with Prettier
```

---

## Troubleshooting

**The link says "Resolve not running" while Resolve is open.**
Almost always *External scripting* is not set to *Local* (see above). Hover the
indicator — its tooltip shows exactly what the bridge saw.

**A change to shared code isn't showing in the browser.**
Vite caches its pre-bundle of `@lower-thirds/shared`. `dev.sh` clears that cache
on every start; if you started Vite by hand, delete
`apps/frontend/node_modules/.vite` and restart.

**Render button is disabled.**
The bundled ffmpeg didn't download. Re-run `./scripts/setup.sh`.

**Ports 3000 or 5173 are already in use.**
An earlier run didn't shut down. `pkill -f "vite|nest start"`, then start again.

---

## Licence

[MIT](LICENSE) — free to use, modify and distribute, provided the copyright
notice is kept.

### Third-party licences

The code in this repository is MIT. Its runtime dependencies — Vue, NestJS,
TypeORM, better-sqlite3, `@napi-rs/canvas`, socket.io and class-validator — are
MIT as well.

One exception is worth naming: **`ffmpeg-static` is GPL-3.0-or-later**. No
ffmpeg binary is redistributed here — it is downloaded into `node_modules`
during `./scripts/setup.sh`, which is git-ignored — and the app runs it as a
separate process rather than linking against it.

If you package this into a distributable application that ships the binary (a
`.dmg`, an Electron build, an installer), the GPL terms travel with it and apply
to what you distribute. The usual way around that is to bundle an LGPL build of
ffmpeg instead, or to require ffmpeg to be installed separately on the machine.

I'm not a lawyer and this isn't legal advice — if you plan to distribute a
packaged build commercially, it's worth a proper look.
