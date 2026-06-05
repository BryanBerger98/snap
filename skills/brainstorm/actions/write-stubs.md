# 04 — Write stubs + finalize

Persist the converged features as one-line catalogue stubs, then lint and regenerate the
views.

## Inputs
- `survivors` (required) — from `converge-features`.

## Outputs

`<docsPath>/features/FEAT-*.md` (`depth: stub`) from
`${CLAUDE_PLUGIN_ROOT}/templates/product-model/feature.md`, then a clean lint + refreshed
`INDEX.md`/`ROADMAP.md`.

## Depends on
- `converge-features`

## Process
1. For each survivor, allocate the next free `FEAT-` id (zero-padded 3), kebab-case slug.
2. Fill the template as a **stub**: `title`, `related: [PER-*]`, `value_hypothesis`,
   `depth: stub`, `status: idea`. **Delete the PRD body block** (JIT — that's
   `/define --spec`). Set `parents: [BRF-001]`; keep persona links two-way (D-014).
3. Leave `horizon` at the template default — prioritization is `/roadmap`'s job, not here.
4. **Finalize** per `${CLAUDE_PLUGIN_ROOT}/reference/product-model/core-io.md`: run
   `lint-docs` (fix every ERROR), then `build-index` to regenerate the views.

## Test

`node ${CLAUDE_PLUGIN_ROOT}/scripts/lint-docs.mjs <project_dir>` exits 0; each new feature
passes the **stub** checklist (frontmatter only: `title` + ≥ 1 persona + non-empty
`value_hypothesis`, no PRD body).
