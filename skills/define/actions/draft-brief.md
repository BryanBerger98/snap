# 03 — Draft the Brief (PR-FAQ)

Run the Brief discovery loop and write `BRF-001` only after the user confirms. The
anchor of the whole base — spend the most time here.

## Inputs
- `intent` (required) — the user's raw idea (greenfield) or `draft_understanding` (brownfield).

## Outputs

`<docsPath>/brief/BRF-001-<slug>.md` from `templates/product-model/brief.md`, plus
`briefConfirmedAt` stamped in `.snap/define-progress.json`.

## Depends on
- `load-state`

## Process
1. Read `reference/brief-playbook.md` and `reference/product-model/discovery.md`.
2. **Elicit → dig** (2–4 rounds): problem (whose pain, frequency, current alternatives,
   cost of inaction), why-now, the one target segment, value in one line, North Star,
   explicit non-goals, top risk. Brownfield: capture `Vision implicite` vs `Vision cible`.
3. **Restate** the press release + FAQ in your own words; get an explicit yes/correction.
   Do not write before confirmation (quality bar in `discovery.md`).
4. Write `BRF-001` (singleton — reuse `001`), strip guidance comments, set `created`/
   `updated` to today, `status: draft`.
5. Stamp `briefConfirmedAt` once the user confirmed. Run `finalize`.

## Test

`node ${CLAUDE_PLUGIN_ROOT}/scripts/lint-docs.mjs <project_dir>` exits 0 and `BRF-001`
passes the Brief checklist (TL;DR · Communiqué complet · FAQ 5 réponses non vides). The
file is **not** written before `briefConfirmedAt` is set.
