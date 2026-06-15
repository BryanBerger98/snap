---
name: roadmap
description: "Prioritize the feature catalogue into Now / Next / Later relative to the product vision, deliberately MINIMIZING Now and Next so the product ships fast (unless the user states otherwise), then regenerate the roadmap view. Use when a feature catalogue exists and the user wants to prioritize, sequence, plan releases, or build the roadmap. Do NOT use for generating features (use /brainstorm) or specifying a feature in detail (use /define --spec)."
argument-hint: ""
disable-model-invocation: false
allowed-tools: Read, Write, Edit, Glob, Grep, AskUserQuestion, Bash(node *)
---

# /roadmap — Prioritization

Sort the feature catalogue into **Now / Next / Later** against the vision. The core
discipline: **keep Now and Next small.** The product must be shippable as fast as
possible — `Later` should hold more than Now and Next combined, unless the user's goals
say otherwise. The roadmap is a **generated view**; this skill sets each feature's
`horizon` and regenerates it.

## Available actions

| #  | Action           | Role                                                          | Input          |
| -- | ---------------- | ------------------------------------------------------------ | -------------- |
| 01 | `load-state`     | Load state; **gate**: ≥ 1 feature in the catalogue            | project dir    |
| 02 | `prioritize`     | Assign Now/Next/Later vs the vision; enforce the Later-heavy rule | catalogue + brief |
| 03 | `apply-horizons` | Write `horizon` on each `FEAT-*`; stamp `roadmapReviewedAt`   | decisions      |
| 04 | `finalize`       | Lint + regenerate `ROADMAP.md` / `README.md`                | writes         |

## Default flow

`01 → 02 → 03 → 04`. The gate in `01` is mandatory: an empty catalogue ⇒ **stop and tell
the user to run `/brainstorm`** first.

## Transversal rules

- **Minimize Now & Next.** Default bias: the smallest set that ships a coherent product.
  Aim for `Later` to outweigh `Now` + `Next`. Challenge every "Now" — does the first
  release truly need it?
- **Anchor on the vision.** A feature is `Now` only if it serves the Brief's North Star
  and a `Now` persona scenario. Nice-to-haves go `Later`.
- **Capture the why.** A notable sequencing choice (what's cut from v1 and why) becomes an
  append-only `ADR-*`.
- **Generated view.** Never hand-edit `ROADMAP.md`; it's rebuilt from the `horizon`
  frontmatter. This skill does not write feature bodies (that's `/define --spec`).

## References (documents to read)

- `reference/prioritization-playbook.md` — the Now/Next/Later criteria + the restriction rule.

## External data (shared product-model core — R7, never copy)

- `${CLAUDE_PLUGIN_ROOT}/reference/product-model/core-io.md` — load / gate / lint / regenerate.
- `${CLAUDE_PLUGIN_ROOT}/reference/product-model/{id-scheme,frontmatter-schema,checklists}.md`.
- `${CLAUDE_PLUGIN_ROOT}/templates/product-model/adr.md` — frozen decision template.
- `${CLAUDE_PLUGIN_ROOT}/scripts/{build-index,lint-docs}.mjs` — view generator + lint gate.

## Current state (auto-injected)

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/build-index.mjs" "${CLAUDE_PROJECT_DIR}" --digest`
