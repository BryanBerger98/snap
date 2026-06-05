# 04 — Define vision & personas

Dig who the product is for, why, and how success is measured. Writes the personas and
enriches the Brief's vision — no new entity type.

## Inputs
- `confirmed_brief` (required) — `BRF-001` with `briefConfirmedAt` set.

## Outputs

`<docsPath>/personas/PER-*.md` (1–3, `proto`) from `templates/product-model/persona.md`,
plus an updated `BRF-001` (vision + success-metric answers in the FAQ).

## Depends on
- `load-state` (gate: `BRF-001` exists **and** `briefConfirmedAt` set)

## Process
1. **Gate.** If the brief is missing or unconfirmed, stop and route to `/define --new`.
2. Read `reference/vision-playbook.md`.
3. Per persona: dig JTBD (one sentence), top pains this product removes, desired gains,
   triggers/context of use, 2–3 key scenarios. Challenge: distinct person + distinct job,
   or the same persona renamed? No fictional bio until `validé`.
4. Dig the **vision + success metric** (the single North Star that proves value); push
   back on vanity metrics. Update `BRF-001` FAQ (`Pour qui` → `PER-*`, `Comment on mesure
   le succès`).
5. Restate, confirm, write `PER-*` and the brief update. Keep links in sync
   (`PER-*.parents = [BRF-001]`). Run `finalize`.

## Test

`lint-docs` exits 0; ≥ 1 persona present with all mandatory sections; `BRF-001`'s success
answer is non-empty; persona↔brief links are two-way.
