# Prioritization playbook — Now / Next / Later

The bias is **ship fast**. Most ideas are `Later`. Your job is to defend a tiny `Now`.

## The three horizons
- **Now** — the minimal set that ships a **coherent, usable** product that moves the
  North Star. Nothing optional. If a `Now` feature were cut and the product still
  delivers its core value, it wasn't `Now`.
- **Next** — the obvious follow-up once `Now` is live and learning from real use. Still
  small.
- **Later** — everything else: nice-to-haves, second-order personas, scale features,
  bets that need validation. This is where most of the catalogue lives.

## The restriction rule
Push back until **`Later` outweighs `Now` + `Next`.** If `Now` is large, you are almost
certainly smuggling nice-to-haves into v1. Re-test each against the North Star and a `Now`
persona scenario. The only valid override is an explicit user goal (e.g. a contractual
scope, a launch that genuinely needs more) — record that as the exception in the ADR.

## Test for "Now"
A feature is `Now` only if **both** hold:
1. it serves the Brief's North Star, and
2. a `Now` persona's key scenario can't complete without it.

Otherwise → `Next` or `Later`.

## Capture the cut
The interesting decision is what you *defer*. Record "v1 ships X; we cut Y and Z because
…" as an append-only `ADR-*`. That rationale is what protects the small `Now` later.
