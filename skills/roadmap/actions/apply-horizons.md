# 03 — Apply horizons

Write the decided horizon onto each feature and stamp the roadmap-reviewed signal.

## Inputs
- `decisions` (required) — the per-feature horizon from `prioritize`.

## Outputs

Each `FEAT-*` frontmatter `horizon` updated; `roadmapReviewedAt` set in
`.snap/define-progress.json`; any sequencing `ADR-*` written.

## Depends on
- `prioritize`

## Process
1. For each feature, set `horizon` (Now/Next/Later), keep `created`, bump `updated`,
   preserve links and `id`. Do **not** touch bodies or `depth`.
2. Write any sequencing `ADR-*` from `templates/product-model/adr.md` (append-only),
   linked to the affected features.
3. **Stamp `roadmapReviewedAt`** in `.snap/define-progress.json` — this is the signal
   `/define --spec`'s gate reads (a feature being `Now` is otherwise just the template
   default; see `core-io.md` §progress marker).

## Test

`node ${CLAUDE_PLUGIN_ROOT}/scripts/lint-docs.mjs <project_dir>` exits 0; every feature
has a valid `horizon`; `roadmapReviewedAt` is set.
