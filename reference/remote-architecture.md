# Snap — remote backend architecture (ports & adapters)

Shared reference for the remote-backend agents (`snap-loader`, `snap-writer`,
`snap-linker`, `snap-provisioner`) and the skills that orchestrate them
(`/define`, `/ticket`, `/snap:init`). Implements decisions **D-027 → D-034**.

## The one rule

A **deterministic core** (decide / validate / render) is **provider-agnostic**.
**Adapters** carry all the I/O variation. A Node **script cannot call MCP** — MCP
lives only in the *model's* toolspace — so every remote read/write is an **agent**
job; scripts only ever cover the `repository` provider.

```
            repo provider                    remote provider (notion/affine/jira/github-projects)
read state  build-*.mjs --digest (script)    snap-loader (agent, MCP) → compact map + scratch JSON
validate    lint-*.mjs (script, on disk)     lint-*.mjs --from-json (script, on the fetched JSON)
render      deterministic (in the writer)    deterministic (in the writer)
persist     Write file (parent/writer)       snap-writer (agent, MCP create/update)
views       build-*.mjs writes INDEX/BOARD   native platform views (nothing to generate)
provision   nothing                          snap-provisioner (agent) at /snap:init
```

## Normalized entity (D-028)

Every loader yields the **same** shape; every consumer reads it the same way:

```json
{ "id": "FEAT-001", "type": "feature",
  "fm": { "id": "FEAT-001", "type": "feature", "title": "…", "status": "building",
          "stability": "living", "language": "fr", "created": "…", "updated": "…",
          "links": { "parents": ["BRF-001"], "children": [], "related": ["PER-001"] } },
  "body": "## …",
  "source": { "provider": "notion", "ref": "<page-id>" } }
```

- `fm` — raw frontmatter, kept verbatim (heterogeneous keys per type).
- `body` — **optional**: present for lint + write, omitted for digest/views (no
  wasted remote body fetch).
- `source.ref` — the **address** of the entity: a `.md` path (repo), a Notion
  page-id, a Jira issue-key. Carries the update target for idempotence.

The shared loader lives in `scripts/lib/entities.mjs`
(`loadFromFs` / `loadFromJson` / `parseStateFile`).

## Scratch transport (`.snap/tmp/`, gitignored)

Remote state moves agent → script as a **file**, never stdin/inline (large JSON
with quotes/accents would die in shell escaping). The agent writes it with the
`Write` tool; the script reads it with `--from-json <path>`.

- `.snap/tmp/state.json` — `{ "entities": [ …normalized… ], "externalIds": [ … ] }`
  written by `snap-loader`, consumed by `lint-*.mjs --from-json` (the gate) and, if
  needed, `build-*.mjs --from-json`. `externalIds` lets a remote ticket lint resolve
  cross-root links (`FEAT-`/`PER-`) when the doc base lives on another provider.
- `.snap/tmp/brief-<id>.json` (or similar) — a writer's input brief, when the parent
  prefers a file over an inline prompt for a long body.

> `.snap/` must be gitignored. If it is not yet, add it (alongside `.env`).

## The four roles

- **snap-loader** (read once, upfront) — calls MCP, normalizes to the shape above,
  returns a **compact digest** to the parent (cheap in context) **and** writes
  `.snap/tmp/state.json` (the heavy JSON stays in the loader's isolated context +
  the scratch file). **Fetch-once** (D-029 C2): one remote read serves both the
  skill's reasoning and the lint gate. Fetch bodies only when the run will write
  (the parent passes `withBody`).
- **snap-writer** (fan-out, one per entity) — renders one entity from the parent's
  brief and **persists** it with the tool the parent hands it (`Write` for repo,
  MCP create/update for remote). Returns only a **manifest**
  `{ id, op, target, ref }` — the rendered body never returns to the main context.
  Model is chosen **per spawn** by the parent (haiku for task/bug, sonnet for
  epic/story/feature/PRD).
- **snap-linker** (Notion only, pass 2) — after the writers return their
  `key → page-id` manifests, wires the **native Relations** from the canonical
  key-text links. Repo and AFFiNE skip this pass.
- **snap-provisioner** (`/snap:init`, remote only) — creates the platform structure
  (Notion databases + Brief page + Roadmap view + columns incl. `snap_id`) or
  connects to an existing project (Jira/GitHub), then writes the non-secret locators
  to `snap.config.json` under `remote` (via `init-config.mjs --remoteJson`).

## Idempotence (D-030 / D-031) — lives in the **parent**

1. `snap-loader` returns the full map of what already exists (with `source.ref`).
2. The parent **matches** each entity to write by **Snap id** (`snap_id` column on
   Notion; a label / custom field on Jira/GitHub) → decides **create vs update vs
   skip** *before* spawning. Writers never query existence.
3. **Duplicates = a lint error**, never silent resolution: the same id twice ⇒
   `lint --from-json` exits 1 ⇒ the gate blocks the write. Identity ambiguity is not
   guessed.
4. **Update = load-modify-write (F1)**: the loader read the current remote state, so
   rewriting the **managed** properties (the ones that map frontmatter) is
   idempotent and non-destructive; user-added columns are untouched; the **body is
   rewritten only when it changed**.
5. The parent **only spawns writers for new or changed entities** — unchanged ones
   are skipped (an economy of fan-out, not just correctness).

## Provider routing

- `providers.doc: repository | notion | affine` (product docs, `/define`).
- `providers.tickets: repository | github-projects | jira` (delivery board,
  `/ticket`).
- The `--digest` scripts are **provider-aware**: `repository` prints the real map;
  a remote provider prints a **marker** telling the skill to load via `snap-loader`.
- Exclusive backend, **no mirror/sync** (D-027/D-033): one home per class. Migrating
  later is the deferred `/snap:migrate-docs --to <platform>` command (D-034).

## Per-provider recipes (progressive disclosure)

Read the matching file **only** for the active provider:
- `reference/persist-notion.md` — Notion MCP recipes (doc).
- `reference/persist-affine.md` — AFFiNE recipes (doc).
- `reference/persist-jira.md` — Jira MCP recipes (tickets).
- `reference/persist-github-projects.md` — GitHub Projects recipes (tickets).
- `reference/notion-schema.md` — the frontmatter → Notion column mapping.

## Secrets

Tokens live in `.env` (gitignored). `snap.config.json` and `.mcp.json` hold only
non-secret locators (database ids, project keys). Never put a token in either.
