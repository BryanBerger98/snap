# Ticket checklists — Definition of Ready / Done

`/ticket` validates each ticket against these before promoting its `status`. A
mandatory section that is missing or empty keeps the ticket in its initial status
and is reported as a gap. No critic subagent — this is a structural check, not a
quality judgment (mirror of `/define`, D-015).

## Mandatory sections per entity

| Entity | Sections that must be present and non-empty |
| --- | --- |
| **Epic** | TL;DR · Objectif de livraison · Périmètre — stories incluses · Critères de complétion |
| **Story** | User story · Contexte · Critères d'acceptation · Notes techniques · Définition of Done |
| **Task** | Description · Étapes · Définition of Done |
| **Bug** | Description · Reproduction · Comportement attendu vs observé · Sévérité & impact · Piste / cause suspectée |

(Heading wording follows the ticket `language`; the lists above are the `fr`
default — translate when `language: en`.)

## Frontmatter checks (all tickets)

- Common keys present: `id`, `type`, `title`, `status`, `stability`, `language`,
  `created`, `updated`, `links` (`parents`/`children`/`related`), `board_url`, `owner`.
- `status` is in the entity's allowed enum (see `frontmatter-schema.md`).
- `stability` is `living`.
- A `story` carries `estimate` + `priority`; a `task` carries `estimate` + `kind`;
  a `bug` carries `severity` + `priority` (may be `""`, but the key exists).
- `parents`/`children`/`related` reference IDs that exist in either root
  (`ticketsPath` or `docsPath`) — dangling = error.

## Hierarchy guardrails

- Every **epic** has ≥ 1 `FEAT-*` parent (it mirrors a specified feature).
- Every **story** has exactly one `EPIC-*` parent.
- Every **task** has ≥ 1 `STORY-*` or `EPIC-*` parent.
- Every **bug** has ≥ 1 `STORY-*` / `EPIC-*` / `FEAT-*` parent.
- A story's acceptance criteria should trace back to the source feature's CA — do
  not invent acceptance the feature never promised.

## Status lifecycle

- **Epic**: `todo → doing → done`. `done` only when all child stories are `done`.
- **Story**: `backlog → todo → doing → review → done`. `/ticket` creates a story at
  `backlog` (or `todo` if pulled into the current iteration); build/ship transitions
  belong to later skills (`/develop`, `/qa`).
- **Task**: `todo → doing → done`.
- **Bug**: `open → doing → resolved → closed`. `resolved` = fixed in code;
  `closed` = verified by `/qa`.
- `/ticket` sets the **initial** state and may move stories `backlog → todo`; it does
  not advance work states (that is the delivery skills' job).
