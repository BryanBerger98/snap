# 05 — Specify one Now feature

Take a single `Now` feature and dig its full PRD body. One feature at a time — never
batch-specify the catalogue.

## Inputs
- `feature` (optional) — the feature to specify; default = the next unspecified `Now` one.

## Outputs

The target `FEAT-*` promoted to `depth: specified`, its PRD body filled from
`templates/product-model/feature.md` (TL;DR · Problème & contexte · Objectif & métrique ·
Périmètre In/Out · User flow Mermaid · User stories · Critères d'acceptation · Risques ·
Hors-périmètre).

## Depends on
- `load-state` (gate: `roadmapReviewedAt` set **and** the feature is `horizon: Now`)

## Process
1. **Gate.** No roadmap yet → stop, route to `/roadmap`. Feature not `Now` → refuse
   (JIT: `depth: specified` is reserved for `Now`).
2. Read `reference/spec-playbook.md`.
3. Dig the PRD body: scope in/out, the **user flow** (valid `mermaid` block named
   `flow-<feature-key>-<nom>`), **user stories** (`As a <persona>, I want…, so that…`),
   **acceptance criteria** (Given/When/Then, testable), risks, explicit out-of-scope.
4. **Long body** → delegate drafting to the `snap-drafter` subagent with a structured
   brief + the template; keep the interview here.
5. Set `depth: specified`, advance `status` per the checklist. Then run `tech-review`,
   then `finalize`.

## Test

`lint-docs` exits 0 and the feature passes the `specified` checklist (all PRD sections
present, valid mermaid block). A non-`Now` feature is rejected, not specified.
