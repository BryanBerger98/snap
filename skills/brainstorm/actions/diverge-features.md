# 02 — Diverge (generate candidates)

Proactively generate a long, messy list of candidate features. This is the creative
phase — **you contribute ideas**, you do not wait for the user to list them.

## Inputs
- `personas`, `brief` (required) — from `load-state`.
- `existing_features` (optional) — to avoid duplicates.

## Outputs

A wide candidate list (aim broad, dozens not a handful), each tagged with the persona
pain it might serve:

```
- <title>  · serves <persona>'s pain "<pain>"  · (source: pain-matrix | adjacent | competitor | edge)
```

## Depends on
- `load-state`

## Process
1. Read `reference/ideation-playbook.md`.
2. Generate from several angles, blind to each other (don't filter yet):
   - **pain × persona matrix** — one+ idea per (persona, pain) cell;
   - **adjacent jobs** — what the persona does right before/after the core job;
   - **competitor patterns** — what comparable products do (WebSearch if useful);
   - **edge scenarios** — error, scale, onboarding, offline.
3. Present the raw list to the user and invite additions. Keep it messy on purpose.

## Test

LLM assertion: the list is genuinely generative (contains ideas the user did not state),
covers every persona at least once, and is not pre-filtered. A short echo of the user's
own ideas fails this action.
