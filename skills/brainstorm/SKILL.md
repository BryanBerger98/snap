---
name: brainstorm
description: "Brainstorm a product's feature catalogue: PROACTIVELY generate candidate features from persona pains, adjacent jobs and competitor patterns, then converge by challenging each against a real persona pain, and write the survivors as one-line stubs. Use when the brief and personas exist and the user wants to explore, generate, list, or expand possible features. Do NOT use for framing the brief or vision (use /define), prioritizing Now/Next/Later (use /roadmap), or writing a full feature spec (use /define --spec)."
argument-hint: ""
disable-model-invocation: false
allowed-tools: Read, Write, Edit, Glob, Grep, AskUserQuestion, Task, WebSearch, WebFetch, Bash(node *)
---

# /brainstorm — Feature ideation

Fill the feature **catalogue** with one-line stubs. The job here is **divergence first**:
you actively contribute ideas, not just transcribe the user's. Then you converge —
every surviving feature must serve a real persona pain. Output stays light (`depth:
stub`); the deep PRD comes later via `/define --spec`.

## Available actions

| #  | Action              | Role                                                    | Input            |
| -- | ------------------- | ------------------------------------------------------- | ---------------- |
| 01 | `load-state`        | Load state; **gate**: Brief confirmed + ≥ 1 persona     | project dir      |
| 02 | `diverge-features`  | Proactively generate a long, messy candidate list       | personas + brief |
| 03 | `converge-features` | Challenge each vs a persona pain; cut the orphans        | candidate list   |
| 04 | `write-stubs`       | Write `FEAT-*` (`depth: stub`) + lint + regenerate views | survivors        |

## Default flow

`01 → 02 → 03 → 04`. The gate in `01` is mandatory: no Brief or no persona ⇒ **stop and
tell the user to run `/define`** (you can't brainstorm against thin air).

## Transversal rules

- **This is Phase 3 (Ideate) of the interview engine.** Run propose → triage → dig →
  gate (`reference/interview-engine.md` §Phase 3); gate the Ideate facets `I1`–`I5`
  (divergence coverage, value hypothesis, pain link, domain slug, convergence scoring).
- **Diverge before you converge.** Generate broadly first (matrix of persona × pain,
  adjacent jobs, competitor patterns, edge scenarios). Do not filter while generating.
- **You contribute.** Propose 3–4 expert candidates per cell the user didn't raise — the
  user triages. Reactive transcription is the failure this skill avoids.
- **Every survivor clears the convergence bar.** A feature survives only if it serves a
  real 🟢 pain, is not Kano *Indifferent*, scores above the batch on Opportunity, and
  ladders to the North Star (engine §2.7). One linked to no persona pain is cut or parked.
- **Stubs only.** One line each: title + persona (`related`) + value hypothesis + domain.
  No PRD body here (JIT — that's `/define --spec`).

## References (documents to read)

- `reference/ideation-playbook.md` — divergence techniques + the converge bar.

## External data (shared product-model core — R7, never copy)

- `${CLAUDE_PLUGIN_ROOT}/reference/interview-engine.md` — the shared elicitation engine (Phase 3 Ideate: facets `I1`–`I5` + convergence bar).
- `${CLAUDE_PLUGIN_ROOT}/reference/product-model/core-io.md` — load / gate / lint / regenerate.
- `${CLAUDE_PLUGIN_ROOT}/reference/product-model/{discovery,id-scheme,frontmatter-schema,checklists}.md`.
- `${CLAUDE_PLUGIN_ROOT}/templates/product-model/feature.md` — frozen feature template (stub shape).
- `${CLAUDE_PLUGIN_ROOT}/scripts/{build-index,lint-docs}.mjs` — view generator + lint gate.

## Current state (auto-injected)

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/build-index.mjs" "${CLAUDE_PROJECT_DIR}" --digest`
