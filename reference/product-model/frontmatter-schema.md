# Frontmatter schema

Every entity file starts with a YAML frontmatter block — the machine-readable
contract that `build-index.mjs` parses and that future skills (`/ticket`,
`/develop`) traverse for traceability (D-014/D-019). It is the Markdown rendering
of the schema's database columns; `id` is the universal join key (schema `key`).

## Common keys (all entities)

| Key | Required | Value |
| --- | --- | --- |
| `id` | yes | stable ID, prefix per `id-scheme.md`; immutable |
| `type` | yes | `brief` \| `persona` \| `feature` \| `decision` |
| `title` | yes | quoted human-readable string |
| `status` | yes | per-entity workflow state (see below) |
| `stability` | yes | `frozen` \| `living` \| `append-only` |
| `language` | yes | `fr` or `en`, from `snap.config.json` |
| `created` | yes | ISO `YYYY-MM-DD`, set once |
| `updated` | yes | ISO `YYYY-MM-DD`, bumped on edit |
| `links.parents` | yes (may be `[]`) | upward links — what this derives from |
| `links.children` | yes (may be `[]`) | downward links — what it engenders |
| `links.related` | yes (may be `[]`) | sibling/cross links |

`status` vs `stability` are two axes: `status` = where it is in its workflow;
`stability` = how it mutates (rewritten / appended / quarterly-frozen).

## Per-entity status values

| Entity | `status` enum | `stability` |
| --- | --- | --- |
| `brief` | `draft` \| `review` \| `approved` | `frozen` |
| `persona` | `actif` \| `archivé` | `living` |
| `feature` | `idea` \| `discovery` \| `ready` \| `building` \| `shipped` \| `deprecated` | `living` |
| `decision` | `proposée` \| `actée` \| `supersédée` | `append-only` |

## FEATURE extra keys (schema L3)

| Key | Value |
| --- | --- |
| `type` | `epic` \| `feature` \| `enhancement` |
| `source` | `discovered` \| `inventoried` (greenfield vs brownfield audit) |
| `depth` | `stub` \| `specified` (PRD body present only when `specified`) |
| `horizon` | `Now` \| `Next` \| `Later` \| `Done` → feeds the generated `ROADMAP.md` |
| `board_url` | URL of the GitHub/Jira Epic/Issue (later skills) |
| `owner` | person |
| `value_hypothesis` | `"We believe <X>, measured by <Y>."` |

## PERSONA extra keys

`persona_type`: `proto` \| `validé` · `niveau_preuve`: `hypothèse` \| `entretiens` \| `data`.

## DECISION extra key

`supersede`: the `ADR-*` this decision replaces (chaining).

## Link conventions

- **Brief** is the root: `parents: []`.
- **Persona**: `parents: [BRF-001]`.
- **Feature**: `parents` = parent epic (`FEAT-*`) and/or `BRF-001`; `related` =
  persona(s) it serves (+ outcome/opportunity once those entities are activated).
- **Decision**: `related` = the Feature(s) it decides about; `supersede` chains ADRs.
- Links are **bidirectional by convention**: if `A.children` includes `B`, then
  `B.parents` should include `A`. The index does not auto-repair; the skill keeps
  both ends in sync on write.
- Arrays may be inline (`[A, B]`) or block lists; `build-index.mjs` parses both.
  Prefer inline to match the templates.
