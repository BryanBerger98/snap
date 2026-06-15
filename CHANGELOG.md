# Changelog

All notable changes to the Snap plugin are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/), semver versioning.

## [2.3.0] — 2026-06-15

Full rebuild of the product-definition core. **Migration note** — the docs tree, the
frontmatter schema and the document-provider set all changed; existing product folders
from an earlier Snap version must be migrated before `/define`, `build-index.mjs` or
`lint-docs.mjs` will run clean.

### Added — interview engine + risk model
- **Conversational interview engine** (`reference/interview-engine.md`). Every `/define`
  phase now runs a `PROPOSE → TRIAGE → DIG → GATE` loop instead of free-form Q&A:
  Claude proposes, the user triages, Claude digs into gaps, then a gate confirms the
  artifact before advancing. `AskUserQuestion` (multi-select) is the default channel.
  Five phases — Frame→Brief, Discover→Personas, Ideate→Features, Specify→Feature,
  De-risk→ADR — each backed by a facet checklist (Frame F1–F9, Discover D1–D8,
  Ideate I1–I5, Specify S1–S11, De-risk R1–R5) so no question is silently skipped (D-053).
- **5 big risks** as the de-risking spine. `/define --spec`'s technical review now settles
  **value / usability / feasibility / viability / ethical** (Cagan + ethical); the former
  NFR grid nests under Feasibility. ADRs carry the risk they retire.
- **Three frontmatter fields.** `domain` (structural — must equal the
  `03-features/<slug>/` subfolder, lint-enforced), `shipped_at` (optional, never required,
  never auto-filled, ISO if present — sorts the ROADMAP *Done* group), and `risk_type` on
  ADRs (`value | usability | feasibility | viability | ethical`) (D-052).

### Changed — tree, front-door, brief, flows
- **Numbered, domain-nested docs tree** (D-049): `01-brief/`, `02-personas/`,
  `03-features/<domain>/`, `04-decisions/`. Features now nest by domain slug; the deeper
  walk is handled end-to-end by `entities.mjs`, `lint-docs.mjs` and `build-index.mjs`.
- **`INDEX.md` → `README.md`** as the generated product front-door (D-048); `build-index.mjs`
  writes `README.md` (Index produit) + `ROADMAP.md` (Now/Next/Later/Done with a Domaine
  column) and skips both on its own walk.
- **Brief visual grammar.** PR-FAQ rebuilt as an 8-question FAQ (Pourquoi maintenant /
  Pour qui / Alternatives / Ce qui nous rend uniques / Mesure du succès / Ce qu'on ne fait
  PAS / Taille d'opportunité / Risques & inconnues), a dedicated 🎯 *Hypothèse la plus
  risquée* section, evidence tags (🟢 evidence / 🟡 belief / 🔴 assumption) and an
  *À valider* warning box. Vision implicite/cible is brownfield-only.
- **User flows are numbered steps, not mermaid.** Specified features render flows as
  ordered lists with nested alt/error branches; `lint-docs.mjs` warns on mermaid.

### Removed — AFFiNE backend
- **AFFiNE document provider dropped** (D-050, supersedes D-036). `providers.doc` is now
  `repository | notion`. The Notion render-layer (D-051) maps the markdown-first grammar to
  native Notion blocks (numbered flows, `blockMap[snap_id]` idempotence, Brief-page-first
  provisioning); the repository provider stays the deterministic source of truth.



### Removed — `SessionStart` hook no longer bootstraps config (bugfix)
- **`hooks/hooks.json` is now empty (`{ "hooks": {} }`).** The `SessionStart` hook ran
  `bootstrap-config.mjs` on every session, writing `snap.config.json`, `.env.example` and
  a `.gitignore` guard into **every** project opened with Claude — including projects that
  don't use Snap. Config setup is now **exclusively manual** via `/snap:init`; nothing runs
  at session start, so Snap never pollutes a project that didn't opt in (D-047, amends
  D-002/D-020).
- **Self-heal preserved.** Every skill still calls `bootstrap-config.mjs` (minimal
  defaults) when it finds `snap.config.json` missing, so removing the hook breaks no real
  Snap usage — the config is created on demand, never ahead of time. `bootstrap-config.mjs`
  is kept (called by `/snap:init` + self-heal); only its header comment changed.

### Changed — product definition split into gated phases
- **`/define` is now a gated router.** It owns the Brief (`-n`/`--new`, PR-FAQ), the Vision
  + Personas (`-v`/`--vision`) and a single Now feature's Spec + technical review
  (`-s`/`--spec`). A phase refuses to run until the previous one is complete and confirmed
  (hybrid gate: entity digest + `.snap/define-progress.json` holding `briefConfirmedAt` /
  `roadmapReviewedAt`). No-arg advances to the next unmet phase and **redirects by message**
  to the sibling skills when they are due (D-042/D-044/D-045).
- **`/brainstorm` (new).** Proactively generates the feature catalogue — diverge (persona ×
  pain matrix, adjacent jobs, competitor patterns) then converge (every survivor serves a
  real persona pain). Writes one-line stubs (`depth: stub`); the deep PRD stays in
  `/define --spec`.
- **`/roadmap` (new).** Prioritizes the catalogue into Now / Next / Later with a deliberate
  Later-heavy bias (the smallest set that ships); writes each feature's `horizon` and
  regenerates the roadmap view.

### Changed — shared product-model core at plugin root (no duplication)
- The entity model moved from `skills/define/` up to the plugin root and is now shared by
  the three definition skills via `${CLAUDE_PLUGIN_ROOT}/…` (R7, zero copy):
  `reference/product-model/` (`core-io.md`, `discovery.md`, `id-scheme.md`,
  `frontmatter-schema.md`, `checklists.md`, `schema.md`), `templates/product-model/`
  (`brief`, `persona`, `feature`, `adr`), and `scripts/` (`build-index.mjs`,
  `lint-docs.mjs`). `skills/ticket/SKILL.md` rewired to the new path (D-043).
- Each skill follows the `generate-skill` router architecture: a pure-router `SKILL.md`,
  atomic `actions/`, and TDD-first `evals/scenarios.json` (D-046).

## [2.1.0] — 2026-06-02

### Changed — `/define` now runs a real discovery session
- **Posture rewrite.** `/define` acts as a senior product manager facilitating an
  iterative Working-Backwards discovery, not a fill-in-the-blanks form. New
  `skills/define/reference/discovery.md` carries the method: per-entity probe banks,
  the elicit → dig → restate → confirm → draft loop, and a quality bar for when to
  stop digging. Removed the `SKILL.md` line that capped the interview to "only the
  gaps (≤ 4 q/round)" — the root cause of shallow, one-shot framing.
- **Brownfield playbook (new).** `/define` now reverse-documents an existing
  codebase: audit the repo → infer the implicit vision → interview the target vision
  → inventory shipped features (`source: inventoried`) → the implicit→cible gap
  becomes the roadmap. Mode (greenfield vs brownfield) is auto-detected at step 3.
- Open conversation is the default elicitation channel; `AskUserQuestion` is reserved
  for discrete forks (horizon bucketing, named options, yes/no gates).

## [2.0.0] — 2026-06-02

### Added (P0 — Scaffolding)
- Plugin manifest (`.claude-plugin/plugin.json`) — loadable, validatable plugin skeleton.
- Team marketplace (`.claude-plugin/marketplace.json`) for private distribution.
- `SessionStart` hook bootstrapping project config on session start.
- `scripts/bootstrap-config.mjs` (Node, cross-platform): creates `snap.config.json`
  and `.env.example`, guards that `.env` is gitignored.
- `snap.config.schema.json`: JSON Schema for the project config.

### Added (P1 — `/define`, entity model per D-019)
- `skills/define/SKILL.md`: `/define` skill — full greenfield playbook or single
  entity, hybrid interview (asks only the gaps), validate + generate views.
- 4 frozen templates (`skills/define/templates/`): `brief` (PR-FAQ), `persona`,
  `feature` (catalogue + conditional PRD body, `depth` stub/specified), `adr`
  (decision, append-only).
- `skills/define/reference/`: `id-scheme.md`, `frontmatter-schema.md`,
  `checklists.md` (Definition of Done + per-entity status lifecycle).
- `skills/define/scripts/build-index.mjs` (Node, no deps): regenerates
  `<docsPath>/INDEX.md` (entity map) and `<docsPath>/ROADMAP.md` (Features by
  horizon) from frontmatters; parses inline/block arrays + flow-maps; fr/en labels.
- `agents/snap-drafter.md`: read-only subagent for long-form drafting, spawned via
  `Task` to preserve the main context.

### Added (P1.5 — hardening)
- `skills/define/scripts/lint-docs.mjs` (Node, no deps): deterministic validation
  gate — frontmatter, status/stability enums, id↔prefix↔type↔filename, link
  integrity (dangling/one-way), brief singleton, stub-vs-specified body shape;
  exit 1 on any error. Wired into `/define` (step 5, before view generation).
- `lib/frontmatter.mjs`: shared YAML-frontmatter parser, factored out of
  `build-index.mjs` and reused by the linter (promoted to `scripts/lib/` in P2).

### Added (P1 — `/snap:init`, D-020)
- `skills/init/SKILL.md`: user-only `/snap:init` skill — interactive config setup
  (language + docsPath) with the secrets guardrails; idempotent.
- `scripts/init-config.mjs` (Node, no deps): deterministic config writer — merges
  chosen values, validates enums, preserves other keys.

### Added (P2 — `/ticket`, D-021)
- `skills/ticket/SKILL.md`: `/ticket` skill — breaks down `specified` Features into a
  delivery backlog (Epic → Story → Task/Bug), hybrid interview, lint + generate views.
- 4 frozen templates (`skills/ticket/templates/`): `epic`, `story` (acceptance criteria
  traced from the PRD), `task`, `bug`.
- `skills/ticket/reference/`: `id-scheme.md`, `frontmatter-schema.md`, `checklists.md`.
- `skills/ticket/scripts/lint-tickets.mjs` (Node, no deps): deterministic gate —
  frontmatter, status/stability enums, id↔prefix↔type↔filename, **cross-root** link
  integrity (resolves `FEAT-*`/`PER-*` in `docsPath`), hierarchy parent rules, per-type
  extra keys; exit 1 on any error.
- `skills/ticket/scripts/build-board.mjs` (Node, no deps): regenerates
  `<ticketsPath>/BACKLOG.md` (Epic→Story→Task/Bug hierarchy) + `BOARD.md` (kanban by
  lane) from frontmatters; fr/en labels.
- Config: `ticketsPath` (default `docs/delivery/`) + `ticket` block in
  `bootstrap-config.mjs`, `init-config.mjs` (`--ticketsPath`), and the JSON Schema.

### Added (P3 — `/wireframe`, D-022)
- `skills/wireframe/SKILL.md`: `/wireframe` skill — turns `specified` Features (user
  flow) and their Stories (states) into Lo-Fi wireframe boards authored **directly in the
  design tool** (Penpot or Figma) through its **MCP server**. First skill that writes
  **nothing to the repo**: no templates, no lint, no generated views — the design tool is
  the source of truth (`wireframe.target: mcp`). Traceability to `FEAT-*`/`STORY-*` is
  carried in board names and descriptions.
- `skills/wireframe/reference/`: `mcp-setup.md` (per-provider connection, auth, the Penpot
  live-tab and Figma paid-beta caveats), `wireframe-conventions.md` (screen anatomy, state
  taxonomy, naming, source→wireframe mapping), `authoring-playbook.md` (provider tool
  recipes + layout heuristics).
- `.mcp.json` (plugin root): declares the design-tool MCP servers `snap-penpot`
  (`${PENPOT_MCP_URL:-http://localhost:4401/mcp}`) and `snap-figma`
  (`${FIGMA_MCP_URL:-https://mcp.figma.com/mcp}`). The unused one degrades gracefully.
- Config: `wireframe` block (`fidelity: lo-fi`, `target: mcp`) + `providers.wireframe`
  default `penpot` in `bootstrap-config.mjs`, `init-config.mjs` (`--wireframeProvider`),
  and the JSON Schema. `.env.example` documents the Penpot/Figma MCP env vars.
- Decision: authoring goes through each tool's **MCP** (verified: Figma REST is read-only
  for design content, Penpot RPC can't author reliably — MCP is the only sound path). The
  no-deps rule (D-018) is preserved: the MCP server is declared infra, not a bundled dep.

### Added (P4 — `/ds`, D-023)
- `skills/ds/SKILL.md`: `/ds` skill — builds the design system **directly in the design
  tool** (Penpot or Figma) through its **MCP server**: token styles (color, typography,
  spacing, radius, effects) tiered primitive → semantic → component, plus components with
  variants and states, bound to the tokens. The tool is the source of truth (`ds.target:
  mcp`); like `/wireframe` it writes **no design-system artifact to the repo**. First
  **bidirectional code↔design** skill: `import` seeds the system from existing code,
  `export` emits code into the user's app.
- `skills/ds/scripts/tokens-codec.mjs` (Node, no deps): deterministic token-format codec —
  **DTCG ⇄ CSS custom properties** and **DTCG → Tailwind theme**, with a `--selftest`
  (round-trip + alias + Tailwind emit). This is `/ds`'s testable core — exercisable
  headless, unlike `/wireframe`. (Tailwind v3 JS config is not parsed — import CSS vars /
  DTCG, or Tailwind v4 `@theme` as CSS.)
- `skills/ds/reference/`: `mcp-setup.md` (reuses the P3 MCP servers, routed by
  `providers.design`; tokens as library styles, components as a component library),
  `ds-conventions.md` (token taxonomy, the three tiers, naming, DTCG mapping, component
  anatomy, source feed), `authoring-playbook.md` (per-provider recipes + import/export
  order + codec invocation).
- Config: `ds` block (`target: mcp`, `tokenFormat: dtcg`, `exportPath: null`) +
  `providers.design` default `penpot` in `bootstrap-config.mjs`, `init-config.mjs`
  (`--designProvider`, `--dsExportPath`), and the JSON Schema. `.env.example` notes that
  `/ds` reuses the design-tool MCP env vars (routed by `providers.design`).
- Decision (D-023): the design system is canonical **in the tool** via MCP; code is an
  import source and export target only. W3C DTCG is the canonical interchange. Reuses the
  P3 `.mcp.json` servers; no new dependency (D-018 preserved).

### Added (P5 — `/design`, D-024)
- `skills/design/SKILL.md`: `/design` skill — turns `specified` Features (user flow) and
  their Stories (states) into complete **Hi-Fi mockups** authored **directly in the design
  tool** (Penpot or Figma) through its **MCP server**, by composing the design system built
  with `/ds`: real **component instances**, **token-driven** styling, **real content** from
  the PRD, every state. Synthesis skill — combines `/wireframe` (structure), `/ds` (style +
  components) and `/define` + `/ticket` (content, flow, states). Like `/wireframe` it writes
  **nothing to the repo** (`design.target: mcp`); traceability to `FEAT-*`/`STORY-*` lives in
  board names and descriptions.
- Structure is **hybrid**: when a matching `/wireframe` board exists it is upgraded to Hi-Fi
  in place; otherwise the layout is derived from the Feature's user flow.
- Interactivity is **config-driven** (`design.interactive`): `static` (default, "hi-fi
  simple": complete styled boards, no links) or `prototype` (clickable prototype links along
  the user flow + state transitions, with **graceful degradation** if the MCP can't author
  links — documented transitions instead of silent drop).
- **Missing component → routes to `/ds`** (never authored inline): the design system stays the
  single source of components; `/design` composes, it does not extend it.
- `skills/design/reference/`: `mcp-setup.md` (reuses the P3 MCP servers, routed by
  `providers.design`; component-instance / style / prototype-link authoring, the DS-present
  check), `design-conventions.md` (what Hi-Fi means, source→Hi-Fi mapping, hybrid resolution,
  state taxonomy, interactivity model, naming), `authoring-playbook.md` (per-provider recipes,
  order of operations, DS-gap rule, prototype wiring + degradation).
- Config: `design` block (`target: mcp`, `fidelity: hi-fi`, `interactive: static`) in
  `bootstrap-config.mjs`, `init-config.mjs` (`--designInteractive static|prototype`), and the
  JSON Schema. Routed by the existing `providers.design` key (shared with `/ds`) — no new MCP
  server. No new dependency (D-018 preserved); no script (pure MCP authoring, like
  `/wireframe`).
- Decision (D-024): Hi-Fi mockups are canonical **in the tool** via MCP, composed from the
  `/ds` design system; structure hybrid, interactivity configurable, DS gaps routed to `/ds`.

### Optimized (token economy — `/define`, D-025)
- `build-index.mjs` gains a `--digest` mode: prints a compact frontmatter-only state
  map (`id·type·status·horizon·depth·links`) to stdout and exits **without writing the
  views**. Defensive on a fresh repo (empty digest, never errors).
- `skills/define/SKILL.md`: a "Current state" section now injects that digest at skill
  load via the `!`command`` directive, and step 2 ("detect existing state") was
  rewritten to read the injected map instead of globbing + reading every entity body —
  cutting the recurring per-run cost of loading full PRD bodies just to map the repo.
  A body is read only when an entity is actually edited.
- `agents/snap-drafter.md`: `model` pinned to `sonnet` (was `inherit`/opus) — drafting
  a body from a frozen template + structured brief is in-scope synthesis; the opus
  parent keeps the interview and decisions. Quality neutral, cheaper generation.

### Optimized (token economy — `/ticket`, D-026)
- `build-board.mjs` gains a `--digest` mode: prints a compact frontmatter-only ticket
  map (`id·type·status·meta·parents`) to stdout and exits **without writing** the
  BOARD/BACKLOG views. Defensive on a fresh repo (empty digest, never errors).
- `skills/ticket/SKILL.md`: a "Current state" section now injects **two** digests at
  skill load via the `!`command`` directive — the **product base** (reusing
  `build-index.mjs --digest`) and the **delivery base** (`build-board.mjs --digest`) —
  and step 2 was rewritten to read both injected maps instead of globbing + reading
  every Brief/Persona/Feature and every ticket body just to map state. A specified
  Feature's PRD body is read only for the Features actually being broken down (to trace
  acceptance criteria); a ticket body only when edited. `snap-drafter` is already
  `sonnet` (D-025), so `/ticket`'s heavy drafting inherits the cheaper generation.

### Added (Remote backend chain — ports & adapters, D-027 → D-035)
- `scripts/lib/entities.mjs` (Node, no deps): the normalized entity loader (D-028) —
  `loadFromFs` / `loadFromJson` / `parseStateFile` yield one shape
  `{ id, type, fm, body?, source: { provider, ref } }` from either local Markdown or a
  remote-fetched JSON scratch file. Has a `--selftest`. Dedups the disk-walk that was
  copy-pasted across the build/lint scripts.
- `--from-json <path>` + **provider-aware `--digest`** on all four scripts
  (`build-index`, `build-board`, `lint-docs`, `lint-tickets`): the digest prints a
  *marker* when the base is remote (a script can't read it — D-029 R1); `--from-json`
  validates / renders the agent-fetched state. The deterministic **gate is preserved on
  every provider**; the `id↔filename` check became repo-only. Repo-mode output is
  unchanged (verified non-regression on the eval fixture).
- `providers.tickets: repository | github-projects | jira` (D-033) replaces the legacy
  `providers.projectManagement`; an optional top-level `remote` block holds the
  non-secret locators a remote backend provisions (Notion db ids, Jira project key,
  GitHub project). Wired through `bootstrap-config.mjs`, `init-config.mjs`
  (`--docProvider` / `--ticketsProvider` / `--remoteJson`) and the JSON Schema. The
  `.gitignore` guard now also ignores `.snap/` (the remote scratch dir).
- Four agents (`agents/`): `snap-loader` (read remote state once via MCP → compact map
  + scratch JSON, D-029 fetch-once), `snap-writer` (render + persist one entity, return
  a manifest only — body never returns, D-030), `snap-linker` (Notion pass-2 native
  relations, D-032), `snap-provisioner` (set up Notion bases / connect a Jira·GitHub
  project at `/snap:init`).
- Six progressive-disclosure references (`reference/`): `remote-architecture.md`,
  `notion-schema.md`, and `persist-{notion,affine,jira,github-projects}.md` (per-provider
  MCP / `gh` recipes; AFFiNE marked connector-pending).
- `/define`, `/ticket`, `/snap:init` wired for remote: step-2 marker → `snap-loader`,
  parent-side idempotence (create/update/skip by Snap id, D-030/D-031), `snap-writer`
  fan-out, the round-trip gate (D-035), native views, and `/snap:init` provisioning +
  the doc/tickets provider interview. D-034 (provider migration) stays post-v1.
- Decision **D-035**: the remote validation gate is a round-trip — a pre-flight lint on
  the loaded state, then a closing re-load + lint of the persisted state (rendered
  bodies never return to the orchestrator). Headless-tested; live MCP runs pending.

### Added (P6 — `/develop`, first code-side skill, D-037)
- `skills/develop/SKILL.md`: user-only `/snap:develop <TICKET-ID> [--mode gate|autonomous]`
  — orchestrates a ticket into code on a `snap/<TICKET-ID>-<slug>` branch and a **draft**
  PR/MR linked to the ticket. Pipeline: resolve → ticket source (local files, or
  `snap-loader` when the backend is remote) → digest → (explore ∥ docs) → plan →
  docs-readiness gate → optional human gate (mode) → develop → draft PR/MR.
- Five model-typed subagents (`agents/`): `snap-digest` (Haiku — condense ticket + linked
  product into a work-brief), `snap-explorer` (Haiku — read-only codebase map +
  conventions), `snap-docs` (Sonnet — library docs via the `snap-context7` MCP, degrading
  to WebFetch then a gap), `snap-planner` (Opus — implementation plan + the library list
  that drives the gate), `snap-developer` (Sonnet — branch + code + conventional commits +
  draft PR/MR via `gh`/`glab`). Each isolates its verbose I/O; only small JSON contracts
  cross between stages (`.snap/tmp/{work-brief,codebase-map,docs-bundle,plan,manifest}.json`).
- Two progressive-disclosure references (`reference/`): `develop-repo.md` (the `gh`/`glab`
  recipe — host detection from the git remote, op→command map, draft-PR/MR + ticket link,
  auth/secrets) and `develop-pipeline.md` (the scratch contract the five agents share).
- **Docs-readiness gate**: every library the plan uses must have a resolved doc in the
  bundle before any code is written; an unresolved library blocks the run (re-fetch or an
  explicit user decision). The developer never codes a library it has no doc for.
- Config: new top-level **`develop.mode`** (`gate` default | `autonomous`) in the JSON
  Schema + both config scripts; `init-config.mjs` gains `--repoProvider github|gitlab|auto`
  (sets the pre-existing `providers.repository`) and `--developMode`; `/snap:init` interviews
  both. `.mcp.json` declares `snap-context7` (HTTP) so library docs ship with the plugin.
- Security: the code host authenticates through the `gh`/`glab` keychain or
  `GITHUB_TOKEN`/`GITLAB_TOKEN` in `.env`; the PR/MR is always a draft (nothing mergeable
  without review); no force-push, no commits on the default branch; tokens never enter
  `snap.config.json` or `.mcp.json` (D-018/D-033). Headless-tested (config scripts +
  schema); live `/develop` runs pending.

### Added (P7 — `/review`, first quality skill, D-038)
- `skills/review/SKILL.md`: user-only `/snap:review [<TICKET-ID> | <PR#/MR!>] [--base <branch>]
  [--fix] [--mode gate|autonomous]` — code review over a **local diff** or a **PR/MR**.
  Pipeline: resolve target (no arg → local `git diff`; a PR/MR number → `gh pr diff` /
  `glab mr diff`; a TICKET-ID → the linked PR/MR via the `/develop` manifest or
  `gh/glab … list --search`) → optional ticket digest → fan out four reviewers in parallel →
  synthesize (dedupe + severity sort + verdict) → deliver → optional `--fix`.
- Five model-typed subagents (`agents/`): `snap-reviewer-correctness` (Opus — bugs, logic,
  edge cases), `snap-reviewer-security` (Sonnet — vulns, secrets, injection, authz, deps),
  `snap-reviewer-conventions` (Haiku — style, naming, repo conventions), `snap-reviewer-quality`
  (Sonnet — reuse, simplification, debt), and `snap-fixer` (Sonnet — applies fixable findings
  for `--fix`). Reviewer diffs stay in their own context; only small JSON contracts cross
  (`.snap/tmp/{review-target,findings-<dim>,review-report,fix-manifest}.json`). Reuses
  `snap-digest` for ticket context.
- Two progressive-disclosure references (`reference/`): `review-repo.md` (the `gh`/`glab`
  recipe — PR/MR diff fetch, inline + summary comments, `--fix` push) and `review-pipeline.md`
  (the scratch contract, severity model, verdict rule, `/fulldev` loop-back contract).
- **Output templates + marker idempotence**: three frozen templates under
  `skills/review/templates/` — `inline-comment.md` (`**[<severity>] <title>**` + detail +
  suggestion), `summary-comment.md` (counts table + verdict, `nit`s collapsed into a
  `<details>` block), `report.md` (local Markdown report). One file per output, filled from
  `review-report.json`. Every PR/MR comment opens with a hidden
  `<!-- snap:review:<file>:<line>:<slug> -->` marker (`slug` = deterministic kebab of the
  title); cross-run dedupe matches the marker (the `file:line + title` text match is the
  legacy fallback), and the summary comment is rewritten in place — re-running adds only
  genuinely new findings, no stacking. `review-repo.md` documents the marker spec + posting.
- **Severity model + verdict**: findings are `blocker | major | minor | nit`; the report
  verdict is `changes-requested` when any blocker/major exists (drives the `/fulldev` loop
  back to `/develop`), else `approve`. Delivery is adaptive: inline PR/MR comments on the
  remote path, a Markdown report on the local path, always a conversation summary.
- Config: new top-level **`review.dimensions`** (array, default all four axes) in the JSON
  Schema + both config scripts; `init-config.mjs` gains `--reviewDimensions a,b,c`;
  `/snap:init` interviews it.
- Security: read-only by default — only `--fix` writes, and only to the working tree or the
  PR branch (never the default branch, never `--force`, never a merge, never an approval).
  `/review` posts comments; it never approves a PR. Tokens never enter `snap.config.json` or
  `.mcp.json` (D-033). Headless-tested (config scripts + schema); live `/review` runs pending.

### Added (P8 — `/tests`, second quality skill, D-039)
- `skills/tests/SKILL.md`: user-only `/snap:tests [<TICKET-ID> | <PR#/MR!>] [--base <branch>]
  [--levels u,i,e] [--mode gate|autonomous]` — **writes** the tests a change needs, runs them,
  and **loops to green**, repairing only the tests, never the source. Pipeline: resolve target
  (no arg → local `git diff`, `source=change`; a PR/MR number → `gh pr diff` / `glab mr diff`;
  a TICKET-ID → the ticket's **acceptance criteria**, `source=ca`) → optional ticket digest →
  map the runner (`snap-explorer`) → plan coverage (write gate) → fan out one tester per level
  → run the suite → triage failures → synthesize + deliver.
- Two model-typed subagents (`agents/`): `snap-tester` (Sonnet — writes/repairs the tests of
  **one** level from acceptance criteria/diff + the codebase map; also runs in **fix mode** with
  `triage.json`; **never touches the source**) and `snap-test-triage` (Sonnet — read-only;
  classifies each red failure as a **test-bug** (repair) or a **source-bug** (the code violates a
  cited acceptance criterion — exit the loop)). Reuses `snap-digest` (acceptance criteria) and
  `snap-explorer` (runner/dir/cmd). The **suite run is deterministic** — done by the skill (Bash),
  not an agent. Test code, diffs, and suite logs stay in the agents' context; only small JSON
  contracts cross (`.snap/tmp/{tests-target,tests-<level>,triage,tests-report}.json`).
- Two progressive-disclosure references (`reference/`): `tests-repo.md` (the `gh`/`glab` recipe —
  PR/MR diff fetch, metadata, the `pr`-path test commit+push to the existing branch) and
  `tests-pipeline.md` (the scratch contracts, the CA-coverage verdict model, the write+run+green
  loop, the `/fulldev` loop-back contract).
- **Output templates** (`skills/tests/templates/`): three frozen templates — `test-plan.md` (the
  coverage plan presented at the write gate: CA × level × file), `report.md` (the local report +
  conversation-summary base: CA-coverage table, suite stats, verdict, failures), and
  `commit-message.txt` (conventional `test(scope): … (<TICKET>)` for the `pr` path). One file per
  output, filled from the JSON contracts; the test files themselves are **not** templated (written
  by `snap-tester` in the repo's own runner/conventions).
- **Green loop + verdict**: the skill runs the suite, and on red spawns `snap-test-triage`;
  `test-bug` failures are re-handed to `snap-tester` (fix mode) and the suite re-run, bounded by
  `tests.maxIterations` (default 3, remaining test-bugs logged as test debt — no silent
  truncation); a `source-bug` exits the loop. The report verdict is `tests-failed` when any
  `source-bug` exists or any in-scope criterion is uncoverable without a source change (drives the
  `/fulldev` loop back to `/develop`), else `passed`. **Coverage = acceptance-criteria coverage**,
  not line coverage (out of scope v1).
- Config: new top-level **`tests`** block (`levels` array default all three, optional `mode`
  inheriting `develop.mode`, `maxIterations` default 3) in the JSON Schema + both config scripts;
  `init-config.mjs` gains `--testLevels a,b,c` / `--testMode gate|autonomous` /
  `--testMaxIterations <n>`; `/snap:init` interviews them.
- Security: writes **test files only**, never the source (a `source-bug` exits to the verdict, not
  a source edit — the `/develop` frontier); `pr` mode commits+pushes to the **existing** PR branch
  only (never the default branch, never `--force`, never a new PR/merge/approval); `local` mode
  leaves tests in the working tree. Tokens never enter `snap.config.json` or `.mcp.json` (D-033).
  Headless-tested (config scripts + schema); live `/tests` runs pending.

### Added (P9 — `/qa`, third quality skill, D-040)
- `skills/qa/SKILL.md`: user-only `/snap:qa [<TICKET-ID> | <PR#/MR!>] [--base-url <url>]
  [--surfaces web,api,cli] [--mode gate|autonomous]` — validates a ticket's **acceptance
  criteria against the RUNNING product** by exercising each criterion live, then emits a **binary
  verdict** (`accepted` | `rejected`). Pipeline: resolve target (a TICKET-ID; no arg → the ticket
  of the current branch/PR; a PR/MR number → the linked ticket) → digest the **acceptance
  criteria** → map the run command + surfaces (`snap-explorer`) → plan the exercise (**boot gate**)
  → bring the env up (reuse `--base-url` or boot — **test/staging only, never prod**) → fan out
  one validator per surface → tear down what it booted → synthesize the verdict → deliver (report
  + ticket transition). Last gate of `/fulldev` (`develop → tests → review → qa`).
- One model-typed subagent (`agents/snap-qa-validator.md`, Sonnet): exercises the acceptance
  criteria of **one** surface (`web` via `agent-browser`, `api` via `curl`, `cli` via the
  product's own command) **sequentially** against the live instance, judges each `met`/`partial`/
  `unmet` with cited evidence, and captures evidence under `.snap/tmp/qa-evidence/`. **Never
  touches the source; never boots/tears down the app** (the skill owns the lifecycle). No triage
  agent — the verdict is binary. Reuses `snap-digest` (acceptance criteria), `snap-explorer`
  (run/surfaces), `snap-loader` (remote ticket), and `persist-<provider>` (ticket transition). Run
  logs, snapshots, and HTTP/CLI dumps stay in the agents' context; only small JSON contracts cross
  (`.snap/tmp/{qa-target,qa-<surface>,qa-report}.json`).
- Two progressive-disclosure references (`reference/`): `qa-runtime.md` (the app lifecycle —
  `url-or-boot`, readiness poll, always-teardown, the hard **never-production** invariant — plus
  the per-provider ticket-transition recipe: comment always, state transition only when mapped)
  and `qa-pipeline.md` (the scratch contracts, the live CA-matrix verdict model, the env lifecycle,
  the `/fulldev` loop-back contract).
- **Output templates** (`skills/qa/templates/`): three frozen templates — `qa-plan.md` (the
  exercise plan presented at the boot gate: CA × surface × how-exercised), `qa-report.md` (the
  local report + conversation-summary base: CA matrix, verdict, env, rejected criteria), and
  `qa-comment.md` (the structured QA comment posted to the ticket). One file per output, filled
  from the JSON contracts.
- **App lifecycle + verdict**: the skill owns boot/readiness/teardown deterministically (Bash
  background) — reusing a provided `--base-url` (no teardown) or booting one and tearing it down
  afterward (always, even on error), on a **test/staging** profile only. The report verdict is
  `rejected` when any in-scope criterion is `partial`/`unmet` (including a required criterion no
  surface could exercise — surfaced, not silently dropped), which drives the `/fulldev` loop back
  to `/develop`; else `accepted`. **One pass — no internal loop** (the retry loop belongs to
  `/fulldev`, so no `qa.maxIterations`). **Coverage = acceptance criteria observed live**, not line
  coverage.
- Config: new top-level **`qa`** block (`surfaces` array default all three, optional `mode`
  inheriting `develop.mode`, optional `run` `{cmd,url,readyWhen,teardown}`) in the JSON Schema +
  both config scripts; `init-config.mjs` gains `--qaSurfaces web,api,cli` / `--qaMode
  gate|autonomous`; `/snap:init` interviews them.
- Security: **never edits the source** (a failing criterion is a verdict, not a patch — the
  `/develop` frontier); runs the app on a **test/staging profile only**, refusing a production base
  URL; the only tracker writes are a QA comment and an optional **mapped** state transition (never a
  new PR/merge/approval/`--force`). Tokens never enter `snap.config.json` or `.mcp.json` (D-033);
  scratch + evidence live under `.snap/tmp/` (gitignored). Headless-tested (config scripts +
  schema); live `/qa` runs pending.

### Added (P10 — `/fulldev`, the palette orchestrator, D-041)
- `skills/fulldev/SKILL.md`: user-only `/snap:fulldev [<TICKET-ID> | <PR#/MR!>] [--mode
  gate|autonomous] [--max-cycles N] [--max-per-gate K] [--base-url <url>]` — orchestrates the whole
  delivery chain `develop → tests → review → qa` in a **bounded loop** until every gate is green or
  the budget is spent. The **last** skill of the palette and its **only looper**: the four
  sub-skills are single-pass verdict emitters; `/fulldev` **invokes** them (Skill tool), **reads
  their verdicts**, and routes any red back to `/develop`. Pipeline: resolve target (ticket-first,
  like `/qa`) → digest the **acceptance criteria** → **auto-detect the entry** (an existing PR →
  start at the gates; otherwise → `/develop` first) → plan (**gate**) → drive the loop → synthesize
  → deliver (report + ticket comment, **PR left in draft**). Never edits the source or the gates,
  never merges.
- `scripts/fulldev-state.mjs` (Node, no deps): the **deterministic loop brain** — a pure state
  machine (`init` / `step`) that applies each round's verdicts, counts per-gate reds, **blocks** a
  gate at `maxPerGate`, picks the next action (`develop` | `gates` | `qa` | `stop`), and computes
  the terminal verdict (`done-green` | `stopped-budget` | `stopped-blocked`). Each round runs
  **tests ∥ review** on the diff and, only when both are green, **qa** live (qa boots the app — never
  on already-rejected code). A `/develop` pass invalidates previously-green gates; blocked gates stay
  skipped. Ships with a `--selftest` (15 checks across greenfield / fix-then-pass / blocked /
  budget-spent / existing-PR scenarios).
- **0 new agent** — pure orchestration: `/fulldev` invokes the sub-skills, which spawn their own
  agents. Reuses `snap-digest`/`snap-loader` (acceptance criteria) and `persist-<provider>` (the
  chain-level synthesis comment on the ticket).
- Two progressive-disclosure references (`reference/`): `fulldev-pipeline.md` (the embedded
  contract — pipeline + state machine + scratch contracts `.snap/tmp/{fulldev-state,fulldev-report}.json`
  + verdict/stop model + sub-skill invocation table) and `fulldev-orchestration.md` (the runtime
  recipe — Skill-tool invocation, per-host entry detection via `gh`/`glab`, `fulldev.mode`
  propagation, draft-only delivery).
- **Output templates** (`skills/fulldev/templates/`): three frozen templates — `fulldev-plan.md`
  (the plan presented at the gate: ticket, detected entry, gates, budget, mode), `fulldev-report.md`
  (the local report + conversation-summary base: gate status, cycle history, verdict), and
  `fulldev-comment.md` (the orchestration-summary comment posted to the ticket). One file per output.
- Config: new top-level **`fulldev`** block (`mode` default `gate` — **overrides** each sub-skill's
  mode; `maxCycles` default `5` — global `/develop` budget; `maxPerGate` default `3` — reds before a
  gate blocks) in the JSON Schema + both config scripts; `init-config.mjs` gains `--fulldevMode
  gate|autonomous` / `--fulldevMaxCycles <n>` / `--fulldevMaxPerGate <n>`; `/snap:init` interviews
  them.
- Security: **never edits the source or the gates** (a red gate is routed back to `/develop`, which
  owns every fix); **never merges / approves / `--force` / opens a new PR** — the chain ends with a
  **draft** PR for a human. Tokens never enter `snap.config.json` or `.mcp.json` (D-033); scratch
  lives under `.snap/tmp/` (gitignored); only small verdict contracts cross between stages.
  Headless-tested (`fulldev-state.mjs --selftest` 15/15 + config scripts + schema); live `/fulldev`
  runs pending.

### Changed
- **AFFiNE connector is live.** The `affine` MCP server (`affine-mcp` stdio binary)
  is registered at user scope; `reference/persist-affine.md` moves from a
  connector-pending *contract* to an executable recipe mapping each operation to a
  real `mcp__affine__*` tool. Because `search_docs` matches titles only (not the
  YAML body), idempotence now rides on two tags per doc — `snap:<type>` (rule-based
  collection membership) and `snap:<id>` (unique lookup via `list_docs_by_tag`); the
  YAML block stays authoritative for `fm`/links (D-032 refinement). `/snap:init`
  updated to provision AFFiNE collections + Brief + Roadmap via the live server.
- Adopted `schema-documentation-produit.md` as the `/define` entity model, rendered
  in Markdown-in-repo (D-019). Replaced the flat 7-artifact set: Vision→Brief
  (PR-FAQ); PRD + User-flow folded into Feature; Roadmap is now a generated view;
  Documentation deferred (out of the definition-doc scope).
- Promoted the shared YAML parser `frontmatter.mjs` from `skills/define/scripts/lib/`
  to plugin-root `scripts/lib/` — imported by both `/define` and `/ticket` scripts, no
  cross-skill coupling.
