---
name: ticket
description: >
  Break down product specs into a versioned Markdown delivery backlog — Epics
  (one per specified Feature), user Stories (with acceptance criteria traced from
  the PRD), technical Tasks, and Bugs — plus a generated Backlog and Board. Use
  after /define to turn Features into actionable tickets before development.
  Optional argument = a ticket type or a FEAT-id; with no argument, breaks down
  every specified Feature that has no Epic yet.
argument-hint: "[epic|stories|tasks|bug|board|FEAT-xxx]"
disable-model-invocation: false
allowed-tools: Read, Write, Edit, Glob, Grep, AskUserQuestion, Task, Bash(git *), Bash(node *)
---

# /ticket — Delivery breakdown

Turn the product knowledge base produced by `/define` into a versioned, traceable
delivery backlog. Tickets live in their own root (`ticketsPath`, default
`docs/delivery/`), separate from the product docs: each ticket = one file +
frontmatter; the hierarchy = `id` links; the Backlog and Board are **generated
views**, never authored by hand. Output is opinionated and **frozen** — fill the
templates, do not invent new section structures.

## v1 entities

`epic` (`EPIC-`, the delivery container mirroring one `specified` Feature) ·
`story` (`STORY-`, the actionable user-facing slice, with acceptance criteria) ·
`task` (`TASK-`, technical sub-unit) · `bug` (`BUG-`, reported defect). The
hierarchy is `FEATURE → EPIC → STORY → TASK/BUG`, encoded in frontmatter `links`.

## Frozen assets — read before drafting

- `templates/<type>.md` — exact section structure per entity (`epic`, `story`,
  `task`, `bug`).
- `reference/id-scheme.md` — argument↔type↔dir↔prefix, numbering, slugs, hierarchy.
- `reference/frontmatter-schema.md` — the YAML contract (common + per-entity keys).
- `reference/checklists.md` — mandatory sections (DoR/DoD) + status lifecycle.

## Current state (auto-injected)

Two **frontmatter-only** digests are generated at skill load — no bodies. The
**product base** (Briefs, Personas, Features — each Feature's `depth` tells
`specified` vs `stub`) and the **delivery base** (existing Epics/Stories/Tasks/Bugs
with their links):

### Product base (source)
!`node "${CLAUDE_PLUGIN_ROOT}/skills/define/scripts/build-index.mjs" "${CLAUDE_PROJECT_DIR}" --digest`

### Delivery base (tickets)
!`node "${CLAUDE_PLUGIN_ROOT}/skills/ticket/scripts/build-board.mjs" "${CLAUDE_PROJECT_DIR}" --digest`

These **are** the maps for step 2. From them you already know which Features are
`specified`, which already have an Epic (a ticket whose `parents` include the
`FEAT-id`), and the full ticket hierarchy — without reading a single body. Read a
**specified Feature's PRD body only for the Features you are about to break down**
(to trace acceptance criteria); read a ticket body only when you edit it. (Both are
snapshots of the pre-run state; entities you create this run are already known to you.)

> **Remote backends (D-027/D-033).** Either digest can be a one-line **marker**
> instead of a map: the **product base** follows `providers.doc`, the **delivery
> base** follows `providers.tickets`. On a marker, load that base via the `snap-loader`
> agent (`domain: doc` for the product map, `domain: tickets` for the delivery map).
> Writes always target `providers.tickets`. See **Remote backend** below; the default
> `repository` path is unchanged.

## Algorithm

### 1. Load config
- Read `snap.config.json`. If missing, run
  `node "${CLAUDE_PLUGIN_ROOT}/scripts/bootstrap-config.mjs" "${CLAUDE_PROJECT_DIR}"`
  then re-read it.
- Resolve `language`, `ticketsPath`, `docsPath`, `ticket.hierarchy`.
- Render every ticket in `language` (default `fr`); for `en`, translate the template
  headings, keep the order and the frontmatter keys.

### 2. Map source + delivery state (from the injected digests, D-026)
- **Repo (default):** use the **two digests auto-injected above** as the maps — they
  already parsed every frontmatter in both roots. Do **not** glob + read bodies.
- **Remote:** a digest that is a **marker** means that base is remote. Load it with the
  `snap-loader` agent (`Task`): `domain: doc` (routed by `providers.doc`) for the
  product map, `domain: tickets` (routed by `providers.tickets`) for the delivery map.
  A run can need both loaders. For a write run, pass `withBody: true` on the delivery
  load (the gate needs ticket bodies); the product load needs bodies only for the
  `specified` Features in scope (to trace acceptance criteria). The tickets loader also
  returns the `externalIds` (FEAT-/PER-) so cross-root links resolve. See **Remote
  backend** below.
- From the **product map**: if no Feature exists, stop and tell the user to run
  `/define` first; note which Features are `specified` vs `stub` (a **`stub`** has no
  PRD → direct them to `/define features` to specify it before ticketing).
- From the **ticket map**: note which Epics/Stories already exist and their
  `FEAT-*` / `EPIC-*` parents.
- Read a **specified Feature's PRD body only when it is in scope** for breakdown
  (step 4) — to trace its user stories + acceptance criteria. Read a ticket body
  only when editing it.

### 3. Determine scope
- Argument = a `FEAT-id` (or a feature title) → break down that Feature (step 4).
- Argument = a type (`epic`/`stories`/`tasks`/`bug`) → create/extend that level.
- Argument = `board` (alias `backlog`) → just regenerate the views (step 7).
- No argument → break down **every `specified` Feature that has no Epic yet**.

### 4. Breakdown playbook (per specified Feature)
Produce in this order, interviewing only the gaps (`AskUserQuestion`, ≤ 4 q/round —
which Features, story slicing, estimates/priorities):
1. **Epic** (`EPIC-*`) — one per specified Feature; `parents: [FEAT-id]`. Pull the
   TL;DR and the delivery objective from the Feature; completion criteria = the
   Feature's acceptance bar.
2. **Stories** (`STORY-*`) — slice the Feature's user stories into vertical,
   shippable units; `parents: [EPIC-id]`, `related: [PER-*, FEAT-id]`. **Acceptance
   criteria are traced from the Feature's** — refine, never invent what the PRD did
   not promise.
3. **Tasks** (`TASK-*`) — decompose the stories pulled into the current iteration
   into technical sub-units; `parents: [STORY-id]` (or `[EPIC-id]` for cross-cutting
   work). JIT: do not pre-task `backlog` stories.
4. **Bugs** (`BUG-*`) — only when a defect is reported; `parents` = the affected
   Story/Epic/Feature. (Usually created later, by `/qa`.)

### 4-bis. Write each ticket
- Path `<ticketsPath>/<dir>/<ID>-<slug>.md` (dir + prefix per `id-scheme.md`).
- `<slug>` = kebab-case of the title; allocate the next free ID per prefix
  (zero-padded 3).
- Set `created`/`updated` to today; on update keep `created`, bump `updated`,
  preserve existing links and the `id`.
- Keep links **bidirectional** (D-014): an Epic's `children` lists its Stories and
  each Story's `parents` lists the Epic; same for Story↔Task/Bug. Cross-root links
  into `docsPath` (`FEAT-*`, `PER-*`) are expected.
- Set `status` to the entity's initial state (Epic `todo`, Story `backlog` — or
  `todo` if pulled into the iteration, Task `todo`, Bug `open`).
- **Long bodies** (a rich Epic or Story): may delegate to the `snap-drafter`
  subagent via the `Task` tool with a structured brief + the template; keep the
  interview and orchestration in the main context.
- **Validate** against `reference/checklists.md`; if a mandatory section is missing,
  keep the ticket in its initial status and report the gap.
- **Remote backend:** when `providers.tickets` is `jira`/`github-projects`, do **not**
  `Write` files — the `snap-writer` fan-out (see **Remote backend**) creates/updates
  each ticket on the board. Id allocation, idempotence and link decisions stay here.

### 5. Lint (deterministic gate)
- **Repo:** run
  `node "${CLAUDE_PLUGIN_ROOT}/skills/ticket/scripts/lint-tickets.mjs" "${CLAUDE_PROJECT_DIR}"`.
- **Remote:** run the same script with `--from-json .snap/tmp/state.json` — the state
  file carries the delivery entities **and** the `externalIds` (FEAT-/PER-) so
  cross-root links resolve even when the doc base is on another provider (D-033).

It checks frontmatter, status/stability enums, id↔prefix↔type↔filename (filename check
is repo-only), link integrity across **both** roots, the hierarchy parent rules, and
the per-type extra keys. **Exit 1 ⇒ fix every ERROR before finishing** (re-read /
re-fetch, correct, re-lint). Warnings are advisory — surface them in the summary.

### 6. Regenerate the views
- **Repo:** run
  `node "${CLAUDE_PLUGIN_ROOT}/skills/ticket/scripts/build-board.mjs" "${CLAUDE_PROJECT_DIR}"` —
  it rewrites `<ticketsPath>/BACKLOG.md` (Epic → Story → Task/Bug hierarchy) and
  `<ticketsPath>/BOARD.md` (kanban by lane) from the frontmatters.
- **Remote:** nothing to generate — the board's **native views** (Jira board / GitHub
  Project) are the backlog/board.

### 7. Summarize
Report tickets created/updated, their statuses, the hierarchy, the lint result
(errors fixed / warnings left), and any gap that held a ticket back. Point to the
source Features so the traceability is visible.

## Sub-commands

| Invocation | Effect |
| --- | --- |
| `/ticket` | break down every `specified` Feature lacking an Epic |
| `/ticket FEAT-xxx` | break down that Feature into Epic + Stories |
| `/ticket epic` | (re)generate the Epic for a Feature |
| `/ticket stories` | add / refine Stories under an Epic |
| `/ticket tasks` | decompose a Story into technical Tasks |
| `/ticket bug` | log a Bug against a Story / Epic / Feature |
| `/ticket board` (alias `backlog`) | just regenerate the views (`BOARD.md` + `BACKLOG.md`) |

## Remote backend (`providers.tickets` = jira / github-projects)

The deterministic core is unchanged; only I/O is adapted (ports & adapters, D-027 /
D-033). Read `${CLAUDE_PLUGIN_ROOT}/reference/remote-architecture.md` once, then the
active `reference/persist-<provider>.md`. The product base is loaded read-only
(`domain: doc`); the delivery base is the write target (`domain: tickets`).

**Write run** (creating/updating tickets on the board):
1. **Load once** — `snap-loader` (`domain: tickets`, `withBody: true`) → compact map +
   `.snap/tmp/state.json` (current board state + `externalIds`, D-029).
2. **Pre-flight gate** — `lint-tickets --from-json .snap/tmp/state.json`. ERROR ⇒ stop
   and surface (e.g. a duplicate Snap id label): never build on a broken base (D-031).
3. **Idempotence in the parent** (D-030/D-031) — match each ticket by Snap id (carried
   in a Jira label/field or a GitHub label) → **create / update / skip**. Allocate ids
   *before* spawning; resolve links to Snap ids. Only new/changed tickets get a writer.
4. **Fan out `snap-writer`** — one per ticket, parallel, model per type (haiku for
   task/bug, sonnet for epic/story). Pass `op` + target `ref` (issue-key / item-id) +
   the brief. Writers persist and return manifests only.
5. **Closing gate (round-trip, D-035)** — re-load the tickets just written, merge into
   the loaded set, rewrite `.snap/tmp/state.json`, re-run `lint-tickets --from-json`.
   Validates the persisted board. ERROR ⇒ report the offending ticket for correction
   (remote writes are not transactional — D-027).

`board_url` (each ticket's URL on the board) is the **doc → ticket bridge**: it lets a
Feature on the doc side point at its Epic on the board without duplicating state.
Secrets: the provider token lives in `.env`; config holds only `remote.jira` /
`remote.githubProjects` locators. Never write a token to config or `.mcp.json`.

## Rules
- Only break down a **`specified`** Feature — a `stub` has no PRD; route to
  `/define features` first.
- Story acceptance criteria **trace** to the source Feature's — refine, never invent.
- A Story has exactly one Epic parent; keep both ends of every link in sync.
- Never write outside `<ticketsPath>`; never hand-edit `BOARD.md` / `BACKLOG.md`.
- Keep templates frozen: do not add, remove, or rename sections.
- `/ticket` sets the **initial** ticket state; build/ship transitions belong to the
  delivery skills (`/develop`, `/qa`).
- The default `repository` backend needs no API or secret (tickets live in the repo).
  A remote `providers.tickets` (jira/github-projects) needs its token in `.env` and the
  project connected via `/snap:init` — never a token in `snap.config.json` / `.mcp.json`.
