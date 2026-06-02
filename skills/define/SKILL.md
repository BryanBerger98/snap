---
name: define
description: >
  Define product specifications as a versioned Markdown knowledge base — Brief
  (PR-FAQ), Personas, Features (catalogue + PRD), Decisions (ADR) — plus a
  generated Roadmap and Index. Acts as a senior product manager: runs an
  iterative discovery session (Working Backwards) to frame a new product
  (greenfield) or reverse-document an existing one from its codebase (brownfield).
  Optional argument = entity type; with no argument, runs the full discovery
  playbook.
argument-hint: "[brief|personas|features|decisions|roadmap]"
disable-model-invocation: false
allowed-tools: Read, Write, Edit, Glob, Grep, AskUserQuestion, Task, Bash(git *), Bash(node *)
---

# /define — Product definition

Turn a product intent into a versioned, traceable Markdown knowledge base. The
entity model is the Markdown rendering of `schema-documentation-produit.md`
(D-019): each entity = one file + frontmatter; relations = `id` links; the Roadmap
and Index are **generated views**, never authored by hand. Output is opinionated
and **frozen** — fill the templates, do not invent new section structures.

## Posture — run a discovery session, not a form

You act as a **senior product manager facilitating a discovery session**. The
templates are the *output*; the *process* that fills them with real substance lives
in `reference/discovery.md` — **read it before interviewing.** Non-negotiables:

- **Lead and dig.** Drive the framing (Working Backwards), challenge weak answers,
  probe every answer (`why` · `for whom exactly` · `how do we measure it` · `what's
  the riskiest assumption`). Asking only "project name?" + "main features?" is the
  failure this skill must avoid.
- **Iterate, don't one-shot.** Per major entity: elicit → dig → **restate your
  understanding and get confirmation** → draft → validate. Expect 2–4 rounds for the
  Brief, not one. Never write a structurally-complete but hollow entity.
- **Right channel.** Open conversation (prose) is the default for vision, pains,
  value, risks. Reserve `AskUserQuestion` for discrete forks (Now/Next/Later
  bucketing, picking named options, yes/no gates) — never funnel open discovery
  through closed multiple-choice.

## v1 entities

`brief` (PR-FAQ, singleton) · `persona` · `feature` (catalogue; `depth` stub or
specified — the PRD + user flow live in the feature body) · `decision` (ADR,
append-only). Deferred (JIT, schema §7): outcomes, opportunities, releases,
glossary. Two playbooks: **greenfield** (new product, step 4) and **brownfield**
(reverse-document an existing codebase, step 4-ter — uses `source: inventoried`).

## Frozen assets — read before drafting

- `reference/discovery.md` — **the interview method** (posture, the iterative
  greenfield loop, the brownfield audit loop, per-entity probe banks). Read first.
- `templates/<type>.md` — exact section structure per entity (`brief`, `persona`,
  `feature`, `adr`).
- `reference/id-scheme.md` — argument↔type↔dir↔prefix, numbering, slugs, epics.
- `reference/frontmatter-schema.md` — the YAML contract (common + per-entity keys).
- `reference/checklists.md` — mandatory sections (DoD) + per-entity status lifecycle.

## Current state (auto-injected)

The digest below is generated at skill load — a **frontmatter-only** entity map
(id · type · status · horizon · depth · links), no bodies:

!`node "${CLAUDE_PLUGIN_ROOT}/skills/define/scripts/build-index.mjs" "${CLAUDE_PROJECT_DIR}" --digest`

This **is** the map for step 2. Read a full entity file only when you must edit its
body — never glob + read every entity just to learn what exists. (It is a snapshot of
the pre-run state; entities you create this run are already known to you.)

> **Remote backend (D-027).** When `providers.doc` is `notion`/`affine`, the digest
> above is a one-line **marker**, not a map — a script cannot read a remote base.
> Follow the **Remote backend** section below: the `snap-loader` agent fetches the
> state, writes fan out through `snap-writer`, and the gate runs `lint --from-json`.
> The default `repository` path is unchanged.

## Algorithm

### 1. Load config
- Read `snap.config.json`. If missing, run
  `node "${CLAUDE_PLUGIN_ROOT}/scripts/bootstrap-config.mjs" "${CLAUDE_PROJECT_DIR}"`
  then re-read it (the `SessionStart` hook normally created it already).
- Resolve `language`, `docsPath`, `define.order`, `define.validation`.
- Render every entity in `language` (default `fr`); for `en`, translate the template
  headings, keep the order and the frontmatter keys.

### 2. Detect existing state (hybrid, D-009)
- **Repo (default):** use the **state digest auto-injected above** as the entity map
  (id, type, status, horizon, depth, links) — it already parsed every frontmatter. Do
  **not** glob + read entity bodies to build the map; read a specific file only when
  you must edit its body.
- **Remote (`providers.doc` ≠ `repository`):** the injected digest is a **marker**.
  Spawn the `snap-loader` agent (`Task`) with `domain: doc`, the `provider`, the
  `remote.notion`/`remote.affine` locators from config, and `withBody: true` when this
  run will write (the gate needs bodies). It returns the compact map and writes
  `.snap/tmp/state.json`. Use that map as the state. See **Remote backend** below.
- Read any brief passed as free-text context.
- If the map is empty, the base is new — let step 3 pick greenfield vs brownfield
  (an empty doc map over an existing codebase is brownfield). For a remote base that
  is empty/unprovisioned, route the user to `/snap:init` first.

### 3. Determine scope & mode
- Argument = a type → target that entity (sub-commands below; singular or plural).
- No argument → full discovery playbook. **Pick the mode** before interviewing:
  - The doc map is empty **and** the repo holds a real codebase (manifests, source
    beyond Snap's own config/docs) → **brownfield** (step 4-ter): audit the code
    first, then frame. Confirm the mode with the user in one line before digging.
  - Empty doc map, no meaningful codebase → **greenfield** (step 4).
  - Non-empty doc map → you're evolving an existing base; target the in-scope
    entities and re-run the relevant loop for them.

### 4. Greenfield playbook (iterative discovery)
Run the **discovery loop from `reference/discovery.md`** — this is not a single
pass through a form. For each entity below: elicit with open questions → **dig**
into every answer → restate your understanding and get confirmation → draft →
validate. Expect several rounds, especially on the Brief. Don't truncate the
interview because an answer exists — truncate only when it's concrete and confirmed.

Produce in this order (full probe banks in `discovery.md`):
1. **Brief** (`BRF-001`, PR-FAQ) — the anchor; spend the most time here. Dig
   problem (whose pain, alternatives, cost of inaction), why-now, target user,
   one-line value, North Star, explicit non-goals, top risk. Confirm before writing.
2. **Personas** (`PER-*`, 1–3, kept `proto`) — `parents: [BRF-001]`. JTBD, pains,
   gains, triggers, key scenarios per persona.
3. **Features catalogue** (`FEAT-*`, `depth: stub`) — title + persona +
   `value_hypothesis` only; one line each. Challenge each against a persona pain.
   Bucket each `horizon` (Now/Next/Later) — good moment for `AskUserQuestion`.
4. **Specify the `Now` features** (`depth: specified`) — fill the PRD body
   (TL;DR, problème, objectif, périmètre, user flow Mermaid, user stories,
   critères d'acceptation, risques, hors-périmètre).
5. **Decisions** (`ADR-*`) — capture notable choices made during the session as
   append-only ADRs.
6. Lint (step 5), then regenerate the views (step 6).

### 4-bis. Write each entity
- Path `<docsPath>/<dir>/<ID>-<slug>.md` (dir + prefix per `id-scheme.md`).
- `<slug>` = kebab-case of the title; allocate the next free ID (zero-padded 3);
  `BRF-` is a singleton (reuse `001`).
- Set `created`/`updated` to today; on update keep `created`, bump `updated`,
  preserve existing links and the `id`.
- Populate relations: `parents` = what it derives from; persona(s) a feature serves
  go in `related`; keep both ends in sync (D-014).
- **Long bodies** (a `specified` feature, large content): delegate to the
  `snap-drafter` subagent via the `Task` tool with a structured brief + the
  template; it returns ready-to-write Markdown. Keep the interview and
  orchestration in the main context — do **not** fork the whole skill.
- **Validate** against `reference/checklists.md`; set `status` in the entity's enum;
  if a mandatory section is missing, keep the entity in its initial status and
  report the gap. Never overwrite an `approved`/`frozen` brief or edit a settled
  (`actée`) decision in place — supersede instead.
- **Remote backend:** in `notion`/`affine` mode do **not** `Write` files — the
  `snap-writer` fan-out (see **Remote backend**) renders and persists each entity in
  the platform. The interview, id allocation and idempotence stay in this context.

### 4-ter. Brownfield playbook (existing project)
The product exists in code; the docs don't. **Reconstruct the documentation from
reality, then frame where it's going — the gap is the roadmap.** Full method +
probe banks in `reference/discovery.md` ("The brownfield loop"). Sequence:
1. **Audit the codebase** (read-only) — spawn an `Explore` subagent over README,
   manifests, entrypoints, routes, domain models, config and any existing notes.
   Come to the user with a *draft understanding*, not a blank questionnaire.
2. **Brief** — capture **`Vision implicite`** (what the product optimizes today,
   from the audit) **vs `Vision cible`** (interview the user). The delta is the
   roadmap. (The brief template's brownfield subsections, `brief.md`.)
3. **Inventory existing features** (`source: inventoried`) — shipped capabilities
   as feature entities; already-live → `horizon: Done`, `status: shipped`, `stub`.
4. **Personas** — derive from real usage/evidence where available (`niveau_preuve:
   entretiens`/`data` if the user has it), else `proto`.
5. **Roadmap = the gap** — features closing implicit→cible become the
   `Now`/`Next`/`Later` catalogue (`source: discovered`); specify the `Now` ones
   (greenfield step 4). Capture audit findings + sequencing as ADRs.

Both playbooks write via step 4-bis, then lint (step 5) and regenerate views (step 6).

### 5. Lint (deterministic gate)
- **Repo:** run
  `node "${CLAUDE_PLUGIN_ROOT}/skills/define/scripts/lint-docs.mjs" "${CLAUDE_PROJECT_DIR}"`.
- **Remote:** run the same script with `--from-json .snap/tmp/state.json` (the gate is
  preserved on every provider — D-028). See **Remote backend** for when to re-load.

It checks frontmatter, status/stability enums, id↔prefix↔type↔filename (filename check
is repo-only), link integrity (dangling/one-way), the brief singleton, and the
stub-vs-specified body shape. **Exit 1 ⇒ fix every ERROR before finishing** (re-read /
re-fetch the offending entities, correct, re-lint). Warnings are advisory — surface
them in the summary.

### 6. Regenerate the views
- **Repo:** run
  `node "${CLAUDE_PLUGIN_ROOT}/skills/define/scripts/build-index.mjs" "${CLAUDE_PROJECT_DIR}"` —
  it rewrites `<docsPath>/INDEX.md` (entity map) and `<docsPath>/ROADMAP.md` (Features
  by horizon) from the frontmatters.
- **Remote:** nothing to generate — the platform's **native views** (the Roadmap view
  provisioned at `/snap:init`, grouped by `horizon`) are the index/roadmap.

### 7. Summarize
Report entities created/updated, their statuses, their relations, the lint result
(errors fixed / warnings left), and any gap that held an entity back.

## Sub-commands (D-011)

| Invocation | Effect |
| --- | --- |
| `/define` | full discovery playbook — greenfield or brownfield, mode auto-detected (step 3) |
| `/define brief` | (re)generate the Brief / PR-FAQ (singleton) |
| `/define personas` | (re)generate / extend personas |
| `/define features` | extend the feature catalogue (stubs) and/or specify a `Now` feature |
| `/define decisions` (alias `adr`) | record an ADR |
| `/define roadmap` | just regenerate the generated views (`ROADMAP.md` + `INDEX.md`) |

## Remote backend (`providers.doc` = notion / affine)

The deterministic core is unchanged; only I/O is adapted (ports & adapters, D-027).
Read `${CLAUDE_PLUGIN_ROOT}/reference/remote-architecture.md` once, then the active
`reference/persist-<provider>.md`.

**Read-only run** (nothing written): the `snap-loader` map from step 2
(`withBody: false`) is enough — reason over it, no gate.

**Write run:**
1. **Load once** — `snap-loader` (`withBody: true`) → compact map + `.snap/tmp/state.json`
   (current remote state; one fetch, D-029).
2. **Pre-flight gate** — `lint --from-json .snap/tmp/state.json`. ERROR ⇒ stop and
   surface (e.g. a hand-made duplicate `snap_id`): never build on a broken base (D-031).
3. **Idempotence in the parent** (D-030/D-031) — match each in-scope entity by Snap id
   against the map → **create / update / skip**. Allocate ids for new entities *before*
   spawning; resolve every link to a Snap id. Only new or changed entities get a writer.
4. **Fan out `snap-writer`** — one per entity, parallel, model per type (haiku for light
   bodies, sonnet for a `specified` feature PRD). Pass `op` + target `ref` + the brief.
   Writers persist and return manifests only; bodies never return to this context.
5. **Notion only — `snap-linker` pass 2** — wire native relations from the
   `key → page-id` manifests (D-032). AFFiNE stops at the key-text links.
6. **Closing gate (round-trip, D-035)** — re-load the entities just written (their refs,
   `withBody`), merge into the loaded set, rewrite `.snap/tmp/state.json`, re-run
   `lint --from-json`. This validates the *persisted* state, rendered bodies included.
   ERROR ⇒ report the offending entity for correction — remote writes are not
   transactional (an accepted trade of the remote backend, D-027).

Secrets: the provider token lives in `.env` (held by the MCP server); config holds only
non-secret locators (`remote.notion` db ids). Never write a token to config or `.mcp.json`.

## Rules
- **Discovery over forms.** Run the iterative interview from `reference/discovery.md`;
  never write a structurally-complete but hollow entity, and confirm the Brief's
  problem + vision + North Star with the user before writing `BRF-001`.
- Never overwrite an `approved`/`frozen` Brief without explicit confirmation.
- Decisions are append-only: supersede, never rewrite a settled ADR.
- Never write outside `<docsPath>`; never hand-edit `INDEX.md` / `ROADMAP.md`.
- Keep templates frozen: do not add, remove, or rename sections.
- `depth: specified` is reserved for `Now` features; a `stub` stays a one-liner (JIT).
- The default `repository` backend needs no API or secret (docs live in the repo, D-005).
  A remote `providers.doc` (notion/affine) needs its token in `.env` and the base
  provisioned via `/snap:init` — never a token in `snap.config.json` / `.mcp.json`.
