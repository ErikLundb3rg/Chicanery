---
name: tenfifth project context
description: Architecture and build details for the tenfifth Electron menu bar time logger app
type: project
---

macOS menu bar time logger built with Electron 33, TypeScript, Bun, Preact, and better-sqlite3.

**Why:** User wants to track what they do in 15-minute intervals, log entries, and view a daily timeline.

**How to apply:** When making changes, keep the main/renderer separation strict. Main process = Node.js context, renderer = browser context. IPC bridge in preload.ts is the only crossing point.

## Key build facts

- `bun build` for main process MUST use `--format=cjs` — Electron needs CommonJS
- Preload script MUST be built as CJS (`format: "cjs"` in build-renderer.ts)
- `--external=electron --external=better-sqlite3` are non-negotiable in the main build
- Renderer TSX files need `/** @jsxImportSource preact */` pragma (not tsconfig alone)
- `electron-rebuild` must run after `bun install` to rebuild the native better-sqlite3 addon
- Electron binary download: `node node_modules/electron/install.js` if it's missing after install

## Dev workflow

```
bun run dev    # builds everything + launches electron
```

Or manually:
```
bun run build:main && bun run build:renderer && ./node_modules/.bin/electron .
```

Logs go to stdout/stderr. For background: `./node_modules/.bin/electron . > /tmp/tenfifth.log 2>&1 &`

## Architecture

- `src/main/` — Electron main process (Node context): tray, scheduler, IPC handlers, DB
- `src/renderer/prompt/` — 15-min popup window (Preact)
- `src/renderer/timeline/` — today's entries list (Preact)
- `src/renderer/shared/preload.ts` — contextBridge API surface (only IPC crossing point)
- `src/shared/types.ts` — pure types shared between both sides
- `src/main/db/` — better-sqlite3 queries, migrations

## DB schema (SQLite at userData/tenfifth.db)

- `entries (id, content, interval_start, interval_end, created_at)` — Unix ms timestamps
- `config (key, value)` — key-value store for interval, launchAtLogin
- `schema_version (version)` — migration tracking

## Future work

- Dashboard view (entries:getRange IPC already wired up, just needs renderer)
- electron-builder config for .dmg distribution
