# 04 — Write the shaped stub + finalize (after the user's go)

Persist the validated shape as a one-line catalogue stub **plus a 2-line shaping body**,
then lint and regenerate the views. **Run this only after the user has explicitly validated
a shape** in `propose-shape` — never write on your own initiative.

## Inputs
- `shape` (required) — the validated Intention / Form / Slice 1 / Out-of-scope, plus the
  silently deduced `related` + `value_hypothesis`, from `propose-shape`. When a split was
  chosen, one shape per resulting feature.

## Outputs

`<docsPath>/03-features/<domain>/FEAT-*.md` (`depth: stub`) from
`${CLAUDE_PLUGIN_ROOT}/templates/product-model/feature.md`, then a clean lint + refreshed
`README.md`/`ROADMAP.md`.

## Depends on
- `propose-shape` — and an explicit user go-ahead.

## Process
1. **Confirm the go.** If the user has not clearly validated a shape, stop and ask — do not
   write speculatively.
2. For each shape, allocate the next free `FEAT-` id (zero-padded 3), kebab-case slug.
3. Fill the template as a **stub**, writing the deduced fields silently:
   - `title`, `domain` (functional-group slug — the `03-features/<domain>/` subfolder);
   - `related: [PER-*]` from the deduced persona link — **leave `[]` if none fits**
     (allowed: lint only WARNs, never errors);
   - `value_hypothesis` from the deduced hypothesis (you wrote it; the user never did);
   - `depth: stub`, `status: idea`, `parents: [BRF-001]` when a brief exists. Keep persona
     links two-way when set (D-014).
4. **Replace the PRD body with a 2-line shaping body** — delete the full PRD block, keep
   exactly two H2 (so lint stays green — a stub warns only at ≥3 H2):
   ```
   {{Intention}}            ← one line under the H1

   ## Tranche 1
   {{Slice 1}}

   ## Hors-périmètre
   {{Out-of-scope}}
   ```
   (heading wording follows the entity `language`; `fr` shown above). Write to
   `03-features/<domain>/FEAT-<id>-<slug>.md` (subfolder created on demand — `core-io.md`
   §Write path).
5. Leave `horizon` at the template default — prioritization is `/roadmap`'s job, not here.
6. **Finalize** per `${CLAUDE_PLUGIN_ROOT}/reference/product-model/core-io.md`: run
   `lint-docs` (fix every ERROR; persona/value WARNs are acceptable), then `build-index` to
   regenerate the views.

## Test

`node ${CLAUDE_PLUGIN_ROOT}/scripts/lint-docs.mjs <project_dir>` exits 0; each new feature
is `depth: stub` with exactly two H2 (Tranche 1 + Hors-périmètre), a non-empty deduced
`value_hypothesis`, and no full PRD body; the action does not write before the user has
validated a shape.
