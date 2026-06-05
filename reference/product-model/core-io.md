# Product-model core I/O — shared by `define`, `brainstorm`, `roadmap`

Single source for the load / gate / regenerate steps every definition skill repeats.
Each skill's `load-state` and `finalize` actions **point here** (R7 — no copy). Read
this once per run; the skill-specific gate lives in the skill's own `load-state`.

## Contents
- Load config
- Read state (repo digest / remote loader)
- Progress marker (the hybrid gate signals)
- Lint gate
- Regenerate views
- Remote backend pointer

## Load config
- Read `snap.config.json` at the project root. If missing, the user has not run
  `/snap:init` yet — self-heal with
  `node "${CLAUDE_PLUGIN_ROOT}/scripts/bootstrap-config.mjs" "${CLAUDE_PROJECT_DIR}"`
  (writes minimal defaults), then re-read. Config setup is otherwise manual via
  `/snap:init`; nothing creates it on session start.
- Resolve `language` (default `fr`), `docsPath`, `define.*`, `providers.doc`.
- Render every entity in `language`; for `en`, translate template headings, keep order
  and frontmatter keys.

## Read state
- **Repo (default):** use the **state digest** (frontmatter-only entity map: id · type ·
  status · horizon · depth · links). It is auto-injected at skill load via
  `node "${CLAUDE_PLUGIN_ROOT}/scripts/build-index.mjs" "${CLAUDE_PROJECT_DIR}" --digest`.
  Do **not** glob + read entity bodies to build the map; read a file only to edit it.
- **Remote (`providers.doc` ≠ `repository`):** the digest is a **marker**. Spawn the
  `snap-loader` agent (`domain: doc`, provider, `remote.*` locators, `withBody: true`
  when the run will write). It returns the map and writes `.snap/tmp/state.json`.

## Progress marker (hybrid gate — O2)
Two facts are **not** derivable from entity frontmatter, so they live in
`<docsPath>/../.snap/define-progress.json` (create on first write):
```json
{ "briefConfirmedAt": "<date>", "roadmapReviewedAt": "<date>" }
```
- `briefConfirmedAt` — set by `draft-brief` only after the user confirms the Brief.
  A `BRF-001` file existing is **not** confirmation.
- `roadmapReviewedAt` — set by `roadmap`'s `apply-horizons`. A feature's `horizon: Now`
  is the template default and does **not** prove the roadmap pass ran.
Everything else (does `BRF-001` exist, are there `PER-*`, are there `FEAT-*`) is read
from the digest. Never duplicate entity state into this file.

## Lint gate (deterministic — exit 1 ⇒ fix every ERROR before finishing)
- **Repo:** `node "${CLAUDE_PLUGIN_ROOT}/scripts/lint-docs.mjs" "${CLAUDE_PROJECT_DIR}"`.
- **Remote:** same script with `--from-json .snap/tmp/state.json` (gate preserved on
  every provider — D-028).
Checks frontmatter, status/stability enums, id↔prefix↔type↔filename (repo only), link
integrity (dangling/one-way), the brief singleton, stub-vs-specified body shape.
Warnings are advisory — surface them in the summary.

## Regenerate views
- **Repo:** `node "${CLAUDE_PLUGIN_ROOT}/scripts/build-index.mjs" "${CLAUDE_PROJECT_DIR}"`
  rewrites `<docsPath>/INDEX.md` (entity map) and `<docsPath>/ROADMAP.md` (features by
  horizon). Never hand-edit these.
- **Remote:** nothing to generate — the platform's native views (the Roadmap view
  provisioned at `/snap:init`, grouped by `horizon`) are the index/roadmap.

## Remote backend
The deterministic core is unchanged; only I/O is adapted (ports & adapters, D-027).
Read `${CLAUDE_PLUGIN_ROOT}/reference/remote-architecture.md` once, then the active
`reference/persist-<provider>.md`. Write run: load once (`snap-loader`, `withBody`) →
pre-flight `lint --from-json` → idempotence in the parent (match by snap id →
create/update/skip) → fan out `snap-writer` (one per entity) → Notion-only `snap-linker`
pass → closing round-trip `lint --from-json`. Secrets stay in `.env` (MCP server holds
the token); config holds only non-secret locators.
