# 01 — Load state & gate

Load the entity map and enforce the precondition: there must be a feature catalogue to
prioritize.

## Inputs
- `project_dir` (required) — `${CLAUDE_PROJECT_DIR}`.

## Outputs

```
ok: true
brief: BRF-001
features: [ FEAT-001 (stub), FEAT-002 (stub), ... ]
```
or `ok: false, redirect: /brainstorm`.

## Process
1. Load config + digest per `${CLAUDE_PLUGIN_ROOT}/reference/product-model/core-io.md`.
2. **Gate.** ≥ 1 `FEAT-*` exists. None ⇒ stop and tell the user to run `/brainstorm`.
3. Read the Brief's North Star + `Now` personas (needed to anchor prioritization).

## Test

LLM assertion: with features present, returns the catalogue; with an empty catalogue,
returns `redirect: /brainstorm` and does not proceed.
