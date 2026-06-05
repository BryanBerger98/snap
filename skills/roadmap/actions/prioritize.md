# 02 — Prioritize (Now / Next / Later)

Assign each feature a horizon against the vision, keeping Now and Next deliberately small.

## Inputs
- `features`, `brief` (required) — from `load-state`.

## Outputs

A horizon decision per feature + a rationale, e.g.:

```
FEAT-001 → Now    (serves North Star + a Now persona scenario; minimal shippable core)
FEAT-002 → Later  (nice-to-have; no Now scenario depends on it)
...
sequencing_adr: "v1 ships only the shared session; stats & integrations deferred — why"
```

## Depends on
- `load-state`

## Process
1. Read `reference/prioritization-playbook.md`.
2. For each feature, test against the bar: does the **first release** truly need it (serves
   the North Star **and** a `Now` persona scenario)? If not → `Next` or `Later`.
3. **Enforce the restriction rule:** push back until `Later` outweighs `Now` + `Next`
   (unless the user's stated goal demands otherwise — record that exception).
   `AskUserQuestion` is fine here for the final Now/Next/Later fork.
4. Capture a notable sequencing choice (what's cut from v1 and why) as an append-only
   `ADR-*`.

## Test

LLM assertion: every feature has a horizon justified against the North Star; the `Now`
set is the minimal shippable core; `Later` ≥ `Now` + `Next` (or a recorded exception
explains why not).
