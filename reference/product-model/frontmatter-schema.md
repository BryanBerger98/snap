# Frontmatter schema

Every entity file starts with a YAML frontmatter block — the machine-readable
contract that `build-index.mjs` parses and that future skills (`/ticket`,
`/develop`) traverse for traceability (D-014/D-019). It is the Markdown rendering
of the schema's database columns; `id` is the universal join key (schema `key`).

## Common keys (all entities)

| Key | Required | Value |
| --- | --- | --- |
| `id` | yes | stable ID, prefix per `id-scheme.md`; immutable |
| `type` | yes | `brief` \| `persona` \| `feature` \| `decision` (+ deferred: `outcome` \| `opportunity` \| `release` \| `glossary`) |
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
| `outcome` | `proposé` \| `actif` \| `atteint` \| `abandonné` | `living` |
| `opportunity` | `à explorer` \| `en test` \| `retenue` \| `écartée` | `living` |
| `release` | `publiée` | `append-only` |
| `glossary` | `actif` | `living` |

## FEATURE extra keys (schema L3)

| Key | Value |
| --- | --- |
| `type` | `feature` \| `enhancement` — **no `epic`**: epics are project-management, they live on the ticket board, not in product doc |
| `domain` | functional-area slug (`auth` \| `orgs` \| `rgpd` \| `settings` \| `admin` \| …) — the functional grouping that replaces epic-as-parent. **Structuring**: the slug **must equal** the `03-features/<slug>/` subfolder the file lives in (lint-enforced — see `id-scheme.md` › nesting). One distinct slug ⇒ one subfolder. |
| `shipped_at` | ISO `YYYY-MM-DD` the feature shipped — **optional, never required** (valid even when `status: shipped`), **not auto-filled**. Feeds the `Done` sort in the generated `ROADMAP.md`. Leave blank if unknown. |
| `source` | `discovered` \| `inventoried` (greenfield vs brownfield audit) |
| `depth` | `stub` \| `specified` (PRD body present only when `specified`) |
| `horizon` | `Now` \| `Next` \| `Later` \| `Done` → feeds the generated `ROADMAP.md` |
| `owner` | person |
| `value_hypothesis` | `"We believe <X>, measured by <Y>."` |

> **Project-management boundary.** Epics, the board URL, and execution status
> tracking are *project-management* concerns — they live on the ticket provider
> (GitHub/GitLab/Jira), never in the product doc. The product doc carries the
> *what/why* (`domain`, `horizon`, `value_hypothesis`); the board carries the
> *when/who/where-it-stands*. The bridge is resolved at ticket-creation time, not
> stored as a doc field.

## PERSONA extra keys

`persona_type`: `proto` \| `validé` · `niveau_preuve`: `hypothèse` \| `entretiens` \| `data`.

## DECISION extra keys

- `supersede`: the `ADR-*` this decision replaces (chaining).
- `risk_type`: `value` \| `usability` \| `feasibility` \| `viability` \| `ethical` —
  which of the four-plus-one product risks (Cagan) this entry settles. One ADR
  settles one risk type.

## Deferred-entity extra keys (JIT — dormant until triggered)

These activate only when the entity is created (`id-scheme.md` › deferred entities).
Documented here so the schema is complete; templates already carry them.

| Entity | Extra keys |
| --- | --- |
| `outcome` | `outcome_type` (`North Star` \| `Supporting` \| `Guardrail`), `metric`, `baseline`, `target`, `horizon` |
| `opportunity` | `size` (`S` \| `M` \| `L`), `evidence` |
| `release` | `release_type` (multi: `feature` \| `fix` \| `breaking`) |
| `glossary` | `domain` (functional-area slug), `alias` (synonyms / acronyms) |

## Link conventions

- **Brief** is the root: `parents: []`.
- **Persona**: `parents: [BRF-001]`.
- **Feature**: `parents` = `BRF-001` (epics are PM, **never** a product-doc parent);
  the `domain` field does the functional grouping; `related` = persona(s) it serves
  (+ outcome/opportunity once those entities are activated).
- **Outcome**: `parents: [BRF-001]`; `related` = the Feature(s) that move it.
- **Opportunity**: `parents` = parent opportunity (`OPP-*`) and/or the Outcome it
  frames; `related` = persona(s).
- **Release**: `related` = the Feature(s) shipped in it (append-only log).
- **Glossary**: standalone term; `domain` field places it; `related` = where it's used.
- **Decision**: `related` = the Feature(s) it decides about; `supersede` chains ADRs.
- Links are **bidirectional by convention**: if `A.children` includes `B`, then
  `B.parents` should include `A`. The index does not auto-repair; the skill keeps
  both ends in sync on write.
- Arrays may be inline (`[A, B]`) or block lists; `build-index.mjs` parses both.
  Prefer inline to match the templates.
