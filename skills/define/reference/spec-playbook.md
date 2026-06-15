# Spec playbook — digging one feature's PRD body

Only for a `Now` feature being built next. One at a time. Get inside the user's head:
what they actually do, step by step, and what "done" means. Shared posture:
`../product-model/discovery.md`.

## Dig the PRD body (template `product-model/feature.md`)
- **TL;DR** — the deep-module interface in 3 lines.
- **Problème & contexte** — the need this increment solves (tie to a persona pain).
- **Objectif & métrique** — the outcome it moves; restate the value hypothesis.
- **Périmètre In / Out** — what's in this increment, what's explicitly out. Push *out*
  aggressively — the smallest shippable slice.
- **User flow** — a numbered list of steps. Walk the happy path **and** the key
  branches/errors as nested sub-bullets (`- alternative / erreur : …`). Name every
  decision point. No `mermaid`.
- **User stories** — `As a <persona>, I want <capability>, so that <benefit>.` One per
  distinct intent.
- **Critères d'acceptation** — Given/When/Then, **testable**. Each story → at least one
  criterion. If you can't write the test, the story is too vague.
- **Risques & questions ouvertes** — what could break the increment.
- **Hors-périmètre explicite** — what this feature deliberately does not cover.

## Quality bar
Acceptance criteria that aren't testable, a user flow without branches, a scope that
isn't the smallest shippable slice → keep digging. Then `tech-review`.

## Delegation
For a heavy body, delegate drafting to `snap-drafter` (structured brief + template);
keep the interview in the main context.
