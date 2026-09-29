# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"Pálya" is a self-hosted, Dockerized, Hungarian-language team app: a customer-tracking Kanban board, a team task-tracking Kanban board, and a home page with shared notes/polls/links. UI text, comments in migrations, and commit conventions are in Hungarian; keep new user-facing text in Hungarian to match.

## Commands

There is no test suite and no linter configured in either package — verification is via TypeScript compilation and a production build.

```bash
# Server (server/)
npm run dev      # tsx watch src/index.ts - hot-reload dev server
npm run build    # tsc -p tsconfig.json -> dist/
npx tsc -p tsconfig.json --noEmit   # typecheck only, no output - run before committing

# Client (client/)
npm run dev      # vite dev server, proxies /api to http://localhost:3000
npm run build    # tsc -b && vite build -> ../client-dist/ (also typechecks)

# Full stack via Docker (from repo root)
docker compose up --build -d
docker compose logs -f ugyfelkoveto
```

Always run both the server typecheck and the client build before considering a change done - there's no CI catching regressions otherwise.

## Architecture

**Single container, two apps.** The `Dockerfile` builds the Vite client and the TS server in separate stages, then the runtime stage serves the built client as static files (`client-dist/`) from the same Express process that serves `/api/*` (see `server/src/index.ts`). There's no separate frontend server in production - `client/vite.config.ts`'s `/api` proxy only matters for local `npm run dev`.

**Backend layering:** `routes/*.ts` (Express routers, Zod validation, calls into repos) → `repositories/*.ts` (plain functions/objects wrapping `better-sqlite3` prepared statements, no ORM) → `db.ts` (schema + migrations). Validation schemas live centrally in `utils/validation.ts`, not per-route.

**Migrations are additive and run on every boot**, directly in `db.ts`, guarded by `PRAGMA table_info(table)` checks before `ALTER TABLE ... ADD COLUMN`. There is no migration runner or version table - the pattern for adding a column is:
```ts
let cols = db.prepare("PRAGMA table_info(x)").all() as ColumnInfo[];
if (!cols.some((c) => c.name === "new_col")) {
  db.exec("ALTER TABLE x ADD COLUMN new_col ...");
}
```
Re-query `cols` between sequential migrations touching the same table. Changing a `CHECK` constraint or a `NOT NULL` requires the create-new-table/copy/drop/rename dance (see the `customers.name` migration in `db.ts` for the template) since SQLite can't alter constraints in place.

**Auth/session:** `express-session` + `better-sqlite3-session-store`, backed by the same SQLite file. Separate CSRF token flow (`middleware/csrf.ts`): client fetches `GET /api/auth/csrf` once, sends it back as `X-CSRF-Token` on mutating requests (see `client/src/api/client.ts`'s `api()` helper, which also auto-retries once on a stale-token 403). Most routers apply `router.use(requireAuth)`; a route left public (e.g. `routes/version.ts`, and the login/csrf/me endpoints in `routes/auth.ts`) must not leak per-user or mutable data.

**App-wide (non-user) settings** live in a generic `app_settings` key-value table (`repositories/appSettings.ts`: `get/set`, `getBool/setBool`, `getInt/setInt`), surfaced through `routes/settings.ts` as one flat JSON object (`AppSettings` in `client/src/types.ts`). Adding a new team-wide setting means: extend `updateAppSettingsSchema` in `validation.ts`, read/write it in `readSettings()`/the PATCH handler, add the field to the client `AppSettings` type (every local `useState<AppSettings>(...)` default needs the new field too, since there's no shared context - each page/tab fetches `/api/settings` independently), and add a tab/control in `SettingsModal.tsx`.

**Ordering pattern:** rows in a stage/column (`customers.position`, `tasks.position`, `notes.position`) are plain integers maintained by the repo's `nextPosition()` (append, `MAX+1`) or explicit `reorder()` (rewrites `position` for a whole ordered id list in a transaction). Drag-and-drop reordering across columns always goes through `reorder()`, never through the generic `update()` - see `tasksRepo.reorder()` for the extra bookkeeping this needs (e.g. syncing `done_at` when a drag changes `stage` without going through `update()`).

**Frontend structure:** `pages/*.tsx` are route-level (`App.tsx` wires them to `react-router-dom`), `components/*.tsx` are shared UI, `context/*.tsx` are small hand-rolled providers (`AuthContext`, `ThemeContext`, `ToastContext` - no external state library). Drag-and-drop everywhere (`Board.tsx`, `Tasks.tsx`, `Home.tsx`'s notes grid) uses `@dnd-kit/core` + `@dnd-kit/sortable` with the same shape: `useSensor(PointerSensor, {activationConstraint:{distance:5}})`, `DndContext`/`SortableContext`/`DragOverlay`, and a droppable per column/zone via `useDroppable`.

**Theming:** colors are CSS custom properties on `:root`/`.dark` (`client/src/styles/index.css`) consumed through Tailwind's `rgb(var(--x) / <alpha-value>)` pattern (`tailwind.config.js`) so opacity modifiers keep working; `ThemeContext` toggles the `.dark` class and persists to `localStorage`. The `scale-*` accent colors and per-domain accent hexes (`STAGES`, `TASK_STAGES`, tag palette in `client/src/types.ts`) are intentionally the same in both themes.

**Known CSS trap:** a `backdrop-blur` (i.e. `backdrop-filter`) ancestor becomes a containing block for `position: fixed` descendants, clipping full-viewport modals to that ancestor's box. `TopBar.tsx`'s header uses `backdrop-blur`, so `SettingsModal` is rendered as a sibling (via a Fragment), not a child, of the header.

## Git workflow

This repo follows a **dev → main** convention (not GitHub flow): `dev` is the integration branch for all work; `main` only moves via an explicit release merge (`git merge --no-ff dev`) tagged `vX.Y.Z`. `CHANGELOG.md` is a flat, reverse-chronological list under a permanent `[Unreleased]` header - one line per merged change, prepended; a release inserts a `- YYYY-MM-DD release vX.Y.Z` marker line rather than using Keep-a-Changelog-style sections. `TODO.md` tracks forward-looking work items separately (`## Nyitott` / `## Done`) and is only updated when explicitly asked. Only commit or push when the user explicitly asks for it.
