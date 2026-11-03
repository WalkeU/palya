# Changelog

## Unreleased

## v1.2.10 - 2026-11-03
- Fixed CRITICAL image CVEs: updated proxy-addr to 2.0.8 and removed npm (with its bundled tar) from the runtime image

## v1.2.9 - 2026-10-31
- Changed the changelog to per-release sections (## vX.Y.Z - date) and updated the in-app changelog viewer to match

## v1.2.8 - 2026-10-31
- Fixed the changelog order: release markers now sit below the entries they shipped, so every entry is listed under the right version

## v1.2.7 - 2026-10-31
- New task is scrolled into view with a highlight and opens its detail panel; added a "Még egy feladat" checkbox to create several tasks in a row

## v1.2.6 - 2026-10-30
- Added editable customer and task stages in Beállítások (rename, recolor, reorder, add, remove; "Default" restores the built-in set; Done stays fixed for auto-close)
- Fixed auto-close skipping tasks without done_at (e.g. created straight into Done); sweep now falls back to updated_at

## v1.2.5 - 2026-10-18
- Added a Rendezetlen view next to Havi/Összes on the expenses page, listing every unsettled expense across all periods

## v1.2.4 - 2026-10-18
- Fixed trust proxy accepting spoofed X-Forwarded-For (rate-limit bypass, ERR_ERL_PERMISSIVE_TRUST_PROXY): now only private-network proxies are trusted, overridable via TRUST_PROXY
- Moved the settings tabs into a left-side vertical menu with icons (Feather, bundled locally)

## v1.2.3 - 2026-10-18
- Added optional expense splitting (Költségmegosztás): per-expense participants, payer share deducted automatically, a who-owes-whom card and a one-click settle-up

## v1.2.2 - 2026-10-18
- Added an Elszámolva (settled) mark to expenses: one-click check per row, an Elszámolatlan filter, and per-person "still owed" amounts in the summary
- Added a Költségek (expenses) page: log who bought what, for how much and when, with monthly totals, per-person and per-category breakdowns, filters and CSV export

## v1.2.1 - 2026-10-03
- Gave subtasks their own centralized accent color (plum) instead of reusing the interactive brand teal, and showed the parent task's title in the subtask panel header
- Fixed a broken (white) subtask panel border and blocked nesting subtasks inside subtasks
- Moved the Backlogba button to the footer and gave the subtask detail panel a subtle visual distinction
- Fixed subtask position (now inserts under its parent), stale progress badge counts, and the badge icon
- Added a "Kész" close reason for customers and a reason filter on the Lezárva list; closed cards no longer show the priority/motivation badge
- Added a changelog viewer in Settings and a clearer red drag-over-trash warning when deleting a note

## v1.2.0 - 2026-09-30
- Added subtasks: create sub-tasks under a task, draggable on the board like any other task and labeled with their parent
- Settings now warns before closing with unsaved changes

## v1.1.0 - 2026-09-29
- Added a setting for which field (name or business) shows first on customer cards and the detail panel

## v1.0.0 - 2026-09-29
- Added task search, backlog quick-move, description update button, unassigned filter, auto-close for stale Done tasks (configurable), and app version display
