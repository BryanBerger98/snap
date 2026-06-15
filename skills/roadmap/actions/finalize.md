# 04 — Finalize (gate + views)

Run the lint gate and regenerate the roadmap view. Shared closing step (mirrors
`define`/`brainstorm` finalize).

## Inputs
- `project_dir` (required).

## Outputs

A clean lint (exit 0) and a refreshed `<docsPath>/ROADMAP.md` + `README.md`.

## Process
1. **Lint** per `${CLAUDE_PLUGIN_ROOT}/reference/product-model/core-io.md` (§Lint gate):
   repo → `node ${CLAUDE_PLUGIN_ROOT}/scripts/lint-docs.mjs <project_dir>`; remote → same
   script with `--from-json .snap/tmp/state.json`.
2. **Exit 1 ⇒ fix every ERROR**, then re-lint. Warnings are advisory.
3. **Regenerate views** → `node ${CLAUDE_PLUGIN_ROOT}/scripts/build-index.mjs <project_dir>`
   (remote: native views, nothing to generate).
4. Summarize the Now/Next/Later split and any sequencing ADR.

## Test

`lint-docs` exits 0 and `ROADMAP.md` reflects the new horizons (regenerated, not
hand-edited).
