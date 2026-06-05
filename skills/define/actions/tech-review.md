# 06 — Technical concerns (NFR pass)

Walk the technical grid for a specified feature and capture the choices as decisions plus
a coverage checklist. NFR = non-functional requirements (what isn't a visible feature but
still matters).

## Inputs
- `specified_feature` (required) — a `FEAT-*` at `depth: specified`.

## Outputs

One or more `<docsPath>/decisions/ADR-*.md` (append-only) from
`templates/product-model/adr.md`, plus a coverage checklist appended to the run summary:

```
security    : treated (ADR-00X) | N/A (reason) | to-dig
resilience  : ...
data        : ...
performance : ...
dependencies: ...
```

## Depends on
- `spec-feature`

## Process
1. Read `reference/tech-playbook.md`.
2. For the feature, walk each axis — **security** (authn/authz, injection, secrets),
   **resilience** (load, failure/recovery), **data protection** (privacy, retention),
   **performance** (latency, scale), **dependencies** (new libs, services) — and decide:
   treated / not concerned / to-dig.
3. Capture every notable choice as an append-only `ADR-*` (context · decision ·
   alternatives · consequences). Link `ADR ↔ feature` (`related`).
4. Emit the coverage checklist. Run `finalize`.

## Test

LLM assertion: every axis is explicitly addressed (a decision **or** a justified N/A — no
axis silently skipped); each ADR is append-only and passes the Decision checklist; `lint`
exits 0.
