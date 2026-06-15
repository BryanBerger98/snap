# 07 — Finalize (gate + views)

Run the deterministic lint gate and regenerate the views. Shared closing step for every
writing path (mirrors `roadmap`/`brainstorm` `finalize`).

## Inputs
- `project_dir` (required).

## Outputs

A clean lint (exit 0) and refreshed `<docsPath>/README.md` + `<docsPath>/ROADMAP.md`
(repo), or validated remote state (remote).

## Process
1. **Lint** per `${CLAUDE_PLUGIN_ROOT}/reference/product-model/core-io.md` (§Lint gate):
   - repo → `node ${CLAUDE_PLUGIN_ROOT}/scripts/lint-docs.mjs <project_dir>`
   - remote → same script with `--from-json .snap/tmp/state.json`.
2. **Exit 1 ⇒ fix every ERROR** (re-read/re-fetch the offending entity, correct, re-lint).
   Warnings are advisory — surface them.
3. **Regenerate views** (§Regenerate views): repo →
   `node ${CLAUDE_PLUGIN_ROOT}/scripts/build-index.mjs <project_dir>`; remote → nothing
   (native views).
4. Summarize: entities created/updated, statuses, links, lint result, any gap that held
   an entity back.

## Test

`node ${CLAUDE_PLUGIN_ROOT}/scripts/lint-docs.mjs <project_dir>` exits 0 and
`README.md`/`ROADMAP.md` are regenerated (not hand-edited).
