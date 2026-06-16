---
name: define
description: "Define a product as a versioned Markdown knowledge base — Brief (PR-FAQ), Personas + Vision, feature specs and technical decisions — through a GATED discovery session. Routes by flag: --new/-n frames the Brief, --vision/-v digs personas, vision and the success metric (a skippable phase: the user can waive it for an auto-derived proto-persona, or defer it), --spec/-s specifies one Now feature plus its technical concerns; with no flag it advances to the next unmet phase and redirects to /brainstorm or /roadmap when those are due. Use when the user wants to define, frame, scope, or document a product or feature. Do NOT use for brainstorming the feature list (use /brainstorm) or prioritizing the roadmap (use /roadmap)."
argument-hint: "[-n|--new | -v|--vision | -s|--spec <feature>]"
disable-model-invocation: false
allowed-tools: Read, Write, Edit, Glob, Grep, AskUserQuestion, Task, Bash(git *), Bash(node *)
---

# /define — Product definition (gated router)

Turn a product intent into a versioned, traceable Markdown knowledge base, **one
gated phase at a time**. `/define` owns the Brief, the Vision and the per-feature Spec;
it hands off to `/brainstorm` (feature ideation) and `/roadmap` (prioritization) when
those are due. The anti-rush lever is the **gate**: a phase refuses to run until the
previous one is complete and confirmed (`reference/product-model/core-io.md` §gate). Never
write a structurally-complete but hollow entity.

**Read before interviewing:** `${CLAUDE_PLUGIN_ROOT}/reference/interview-engine.md` (the
shared PROPOSE→TRIAGE→DIG→GATE engine + the per-phase facet gates) and
`${CLAUDE_PLUGIN_ROOT}/reference/product-model/discovery.md` (posture + quality bar). They
are the method; the templates are only the output.

## Available actions

| #  | Action          | Role                                                          | Input               |
| -- | --------------- | ------------------------------------------------------------- | ------------------- |
| 01 | `load-state`    | Load config + entity map, detect greenfield/brownfield, compute the next phase | project dir |
| 02 | `audit-codebase`| Brownfield: Explore the code → a draft understanding          | repo                |
| 03 | `draft-brief`   | Brief discovery loop → write `BRF-001` after confirmation     | intent / audit      |
| 04 | `define-vision` | Personas + vision + success metric → `PER-*`, update `BRF-001`| confirmed brief     |
| 05 | `spec-feature`  | One Now feature → deep PRD body (`depth: specified`)          | roadmap + feature   |
| 06 | `tech-review`   | De-risk: value/usability/feasibility/viability/ethical → `ADR-*` + register | specified feature   |
| 07 | `finalize`      | Lint gate + regenerate `README.md`/`ROADMAP.md`             | any write           |

## Default flow (non-sequential — the router dispatches)

Always run `01 load-state` first; every writing path ends with `07 finalize`.

Dispatch by argument:
- `-n` / `--new` → `draft-brief` (brownfield: `audit-codebase` → `draft-brief`)
- `-v` / `--vision` → `define-vision`
- `-s` / `--spec [feature]` → `spec-feature` → `tech-review`

No argument → advance to the next **unmet** phase (read from `load-state`), redirecting
to the sibling skills when it is their turn:

```
1. no Brief                          → draft-brief
2. Brief confirmed, no vision choice → define-vision (presents the entry choice:
                                         continue · skip→brainstorm · skip→stop · later)
   ├ visionSkippedAt set             → Vision satisfied (proto-persona exists), go to 3
   └ visionDeferredAt set            → STOP, vision-deferred (user runs /define -v)
3. Brief+Vision ok, no Features      → STOP, tell the user to run /brainstorm
4. Features exist, roadmap not run   → STOP, tell the user to run /roadmap
5. roadmap run, Now feature unspec'd → spec-feature → tech-review
6. all Now specified                 → propose next (new feature, or done)
```

Once the user has picked at the Vision entry choice, the router **never re-proposes
Vision** — the choice is recorded (`visionSkippedAt` / `visionDeferredAt`) and the user
re-enters it only on purpose via `/define -v`.

`/define` **redirects by message** (it never auto-invokes `/brainstorm` or `/roadmap`) —
this keeps each skill's context clean (D-045).

## Gates (when a phase may run — O2 hybrid)

State is read from the entity digest; four non-derivable signals live in
`.snap/define-progress.json` (`briefConfirmedAt`, `roadmapReviewedAt`, `visionSkippedAt`,
`visionDeferredAt`). Full mechanic in
`${CLAUDE_PLUGIN_ROOT}/reference/product-model/core-io.md`.

| Phase | Gate (must be true to start) |
| --- | --- |
| Brief | — (entry point) |
| Vision | `BRF-001` exists **and** `briefConfirmedAt` set. Skippable: the entry choice waives it (`visionSkippedAt`, auto proto-persona) or defers it (`visionDeferredAt`). |
| Spec + Tech | `roadmapReviewedAt` set **and** the target feature is `horizon: Now` |

If a gate fails, **stop and tell the user which skill to run first** — never silently
build on an unconfirmed base.

## Transversal rules

- **Discovery over forms.** Run the engine loop (propose → triage → dig → gate per
  domain), not a questionnaire. Expect 2–4 rounds on the Brief. Confirm problem + vision
  + North Star before writing `BRF-001`. Read `reference/interview-engine.md` +
  `reference/product-model/discovery.md` first.
- **One phase, one job.** `/define` writes only Brief / Personas+Vision / a feature's
  spec + ADRs. It never invents the feature list (that's `/brainstorm`) or buckets
  horizons (that's `/roadmap`).
- **Right channel.** `AskUserQuestion` triage is the **default**: propose 3–4 expert
  candidates, the user keeps/cuts/edits/adds. Reserve open prose for genuinely open
  input — the vision narrative, a nuance the options miss (`reference/interview-engine.md`).
- **Frozen templates / generated views.** Fill `templates/product-model/*.md` as-is;
  never hand-edit `README.md` / `ROADMAP.md`; never write outside `<docsPath>`.
- **Append-only decisions.** Supersede, never rewrite a settled ADR. Never overwrite an
  `approved`/`frozen` Brief without explicit confirmation.
- **Remote backend** (`providers.doc` = notion): I/O adapts per `core-io.md`;
  the interview, id allocation and idempotence stay in this context. Secrets live in
  `.env`, never in config.

## Current state (auto-injected)

A frontmatter-only entity map (id · type · status · horizon · depth · links), no bodies:

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/build-index.mjs" "${CLAUDE_PROJECT_DIR}" --digest`

This **is** the map for `load-state`. Read a full entity file only to edit its body.

## References (documents to read)

- `reference/brief-playbook.md` — Brief probe bank (problem, why-now, value, North Star, non-goals, risk).
- `reference/vision-playbook.md` — Personas + Vision probe bank (JTBD, pains, triggers, success metric).
- `reference/spec-playbook.md` — PRD body dig (scope, user flow, stories, acceptance criteria).
- `reference/tech-playbook.md` — the de-risk grid: the four big risks + ethical (value, usability, feasibility [incl. the NFR axes], viability, ethical).

## External data (shared product-model core — R7, never copy)

- `${CLAUDE_PLUGIN_ROOT}/reference/interview-engine.md` — the shared elicitation engine (loop, calibration, per-phase facet gates, gate-state persistence).
- `${CLAUDE_PLUGIN_ROOT}/reference/product-model/discovery.md` — interview posture + quality bar.
- `${CLAUDE_PLUGIN_ROOT}/reference/product-model/core-io.md` — load / gate / lint / regenerate procedure.
- `${CLAUDE_PLUGIN_ROOT}/reference/product-model/{schema,id-scheme,frontmatter-schema,checklists}.md` — the entity model.
- `${CLAUDE_PLUGIN_ROOT}/templates/product-model/{brief,persona,feature,adr}.md` — frozen entity templates.
- `${CLAUDE_PLUGIN_ROOT}/scripts/{build-index,lint-docs}.mjs` — view generator + lint gate.

## Sub-commands

| Invocation | Effect |
| --- | --- |
| `/define` | advance to the next unmet phase (router), redirecting to `/brainstorm` / `/roadmap` when due |
| `/define -n` / `--new` | frame the Brief (greenfield) or audit-then-frame (brownfield) |
| `/define -v` / `--vision` | (re)generate personas + dig vision + success metric |
| `/define -s` / `--spec [feature]` | specify one Now feature, then its technical concerns |
