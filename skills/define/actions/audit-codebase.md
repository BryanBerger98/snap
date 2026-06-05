# 02 — Audit codebase (brownfield)

Map an existing product from its code so the Brief starts from a draft understanding,
not a blank questionnaire.

## Inputs
- `repo` (required) — the project working tree.

## Outputs

```
draft_understanding:
  does_today: [ shipped capabilities, surfaces ]
  implicit_vision: "what the product optimizes today, revealed by what's built"
  stack: [ languages, frameworks, package manager ]
  open_questions: [ ... ]
```

## Depends on
- `load-state` (mode = brownfield)

## Process
1. Spawn an `Explore` subagent (read-only) over README/docs, manifests
   (`package.json`/`pyproject`/`go.mod`/…), entrypoints, routes/controllers, domain
   models, env/config, and any existing product notes.
2. Synthesize **what the product does today** and its **implicit vision**.
3. Bring this draft to the user to correct — never open with a blank form. Feed it into
   `draft-brief` as the `Vision implicite`; the interview captures `Vision cible`. The
   delta is the roadmap.

## Test

LLM assertion: the output is a draft understanding citing real files/surfaces and an
implicit-vision statement — not a list of questions. Example pass: "Today the app does X
and Y (see `src/routes/session.ts`); it optimizes for Z. Open question: who are the real
users?"
