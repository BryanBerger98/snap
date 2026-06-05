# 03 — Converge (filter)

Now filter. Every surviving feature must serve a real persona pain; the rest is cut or
parked.

## Inputs
- `candidates` (required) — the divergent list from `diverge-features`.

## Outputs

A converged set, each with a value hypothesis:

```
- <title>  · related: <PER-*>  · value_hypothesis: "We believe <X>, measured by <Y>."
```

## Depends on
- `diverge-features`

## Process
1. For each candidate, ask: which persona pain does it serve? If none → cut (or park with
   a one-line reason).
2. Merge near-duplicates. Group obvious families (a future epic) but keep each as its own
   stub.
3. Write a value hypothesis per survivor. Confirm the set with the user before writing.

## Test

LLM assertion: every survivor is linked to a named persona pain and has a non-empty value
hypothesis; orphan ideas were cut or explicitly parked (not silently kept).
