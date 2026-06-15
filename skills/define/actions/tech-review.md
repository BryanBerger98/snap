# 06 — De-risk (the four big risks + ethical)

Surface every material risk for a specified feature and resolve each one — into a
decision (`ADR-*`) or a planned test — before build starts. This is **Phase 5 of the
interview engine** (`reference/interview-engine.md` §Phase 5). It replaces the old
feasibility-only NFR pass: feasibility is now just one of five risk types.

## Inputs
- `specified_feature` (required) — a `FEAT-*` at `depth: specified`.

## Outputs

One or more `<docsPath>/04-decisions/ADR-*.md` (append-only) from
`templates/product-model/adr.md`, each with a `risk_type`, plus a risk register appended
to the run summary:

```
value       : ADR-00X | assumption-to-test | N/A (reason)
usability   : ...
feasibility : ...
viability   : ...
ethical     : ...
```

## Depends on
- `spec-feature`

## Process
1. Read `reference/tech-playbook.md` (the five-risk grid) and
   `reference/interview-engine.md` §Phase 5.
2. Run the PROPOSE → TRIAGE → DIG → GATE loop over the five risk types (R1–R5):
   - `R1` **value** — will they use / buy it? Evidence, or only stakeholder opinion?
   - `R2` **usability** — can they figure it out without help?
   - `R3` **feasibility** — can we build it? *(the old NFR grid lives here: security,
     resilience, data protection, performance, dependencies.)*
   - `R4` **viability** — legal, finance, compliance, brand, sales, data protection (RGPD).
   - `R5` **ethical** — harm, privacy, fairness, manipulation, exclusion.
   For each: decide it (→ ADR) or mark it an **assumption to test** with a success
   criterion ("We believe… we'll know it's true when…"), or `N/A — reason`.
3. Capture every notable choice as an append-only `ADR-*` (context · decision ·
   alternatives · consequences) with `risk_type` ∈
   `value | usability | feasibility | viability | ethical`. Link `ADR ↔ feature` (`related`).
4. Emit the risk register (one line per risk type) and roll up every 🔴 assumption from
   phases 1–4. Run `finalize`.

## Test

LLM assertion: every risk type is explicitly addressed (a decision, an assumption-to-test,
**or** a justified N/A — no type silently skipped); each ADR is append-only, carries a
valid `risk_type`, and passes the Decision checklist; `lint` exits 0.
