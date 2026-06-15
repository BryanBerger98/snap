# Checklists — Definition of Done

`/define` validates each entity against these before promoting its `status`
(D-015/D-019). A mandatory section that is missing or empty keeps the entity in
its initial status and is reported as a gap. No critic subagent in v1 — this is a
structural check, not a quality judgment.

## Mandatory sections per entity

| Entity | Sections that must be present and non-empty |
| --- | --- |
| **Brief** (PR-FAQ) | TL;DR · Communiqué de presse (Titre/Sous-titre/Problème/Solution/Citation) · FAQ (les 8 questions) · Hypothèse la plus risquée |
| **Persona** | JTBD · Jobs (fonctionnel/émotionnel/social) · Douleurs · Gains attendus · Contournement actuel · Déclencheur & contexte · Forces du switch · Scénarios clés |
| **Feature — `stub`** | frontmatter only: `title` + ≥ 1 persona in `related` + non-empty `value_hypothesis` |
| **Feature — `specified`** | Hypothèse de valeur · Problème & contexte · Objectif & métrique · Périmètre In/Out · User flow (liste numérotée, branches alt/erreur) · User stories · Critères d'acceptation · Exigences non-fonctionnelles · Risques & questions ouvertes |
| **Decision** (ADR) | Statut/Date header · Contexte · Décision · Alternatives · Conséquences |

(Heading wording follows the entity `language`; the lists above are the `fr`
default — translate when `language: en`.)

## Frontmatter checks (all entities)

- Common keys present: `id`, `type`, `title`, `status`, `stability`, `language`,
  `created`, `updated`, and `links` with `parents`/`children`/`related`.
- `status` is in the entity's allowed enum (see `frontmatter-schema.md`).
- A `feature` has `source`, `depth`, `horizon`, and `domain` (= its `03-features/<slug>/`
  subfolder); `shipped_at` is optional (never required, even when `status: shipped`);
  `depth: specified` ⇒ PRD body present.
- `parents`/`related`/`supersede` reference IDs that exist (warn on dangling).

## Guardrails (from the schema)

- **Brief**: 1 North Star captured in the FAQ; ≤ a handful of success measures.
- **Persona**: 1–3 personas in 0→1, kept `proto`; no fictional bio until `validé`.
- **Feature**: `depth: specified` reserved for `Now` items. A `stub` stays a one-liner
  until you're about to build it (JIT — true even backwards for `inventoried`).
- **Decision**: one short entry per decision; it's a journal, not an essay.

## Status lifecycle

- **Brief**: `draft → review` may auto-promote when structural checks pass;
  `→ approved` requires **explicit** user confirmation. An `approved`/`frozen` brief
  is not overwritten without explicit confirmation.
- **Persona**: `actif`; set `archivé` only on explicit request.
- **Feature**: advances along `idea → discovery → ready → building → shipped`
  (`deprecated` terminal) — `/define` sets the initial state and may move
  `idea → discovery/ready`; build/ship transitions belong to later skills.
- **Decision** (append-only): `proposée → actée`; a superseding ADR sets the old
  one to `supersédée` via its `supersede` link — never edit a settled decision in place.
