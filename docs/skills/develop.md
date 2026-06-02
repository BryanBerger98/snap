# `/develop`

> Transforme un ticket de delivery en code sur une branche et une PR/MR draft.
> Charge le ticket (+ contexte produit lié), cartographie le code, réunit la doc des
> libs, planifie, s'arrête (optionnel) pour validation, puis écrit le code, commit, et
> ouvre une pull/merge request draft liée au ticket.

## À quoi ça sert

Prend **un seul ticket** et le livre comme du code sur une branche
`snap/<TICKET-ID>-<slug>`, en commits conventionnels, avec une PR/MR **draft**. Orchestre
cinq subagents typés par modèle : digest du ticket → carte du code ∥ collecte de doc →
plan → gate de **docs-readiness** → (gate de validation optionnel) → écriture, commit,
push, ouverture de la PR/MR draft. Le developer **ne code jamais une lib sans documentation**.

## Invocation

```
/develop <TICKET-ID>                      # ex: /develop STORY-003
/develop <TICKET-ID> --mode gate|autonomous
```

Sans argument, demande quel ticket. `--mode` surcharge `develop.mode`.

## Entrées / Sorties

- **Lit** : `snap.config.json` (`providers.repository`, `providers.tickets`,
  `providers.doc`, `develop.mode`), le fichier ticket (local ou via `snap-loader`), les
  entités produit liées (FEAT/PER/BRF).
- **Écrit** : branche feature, commits, **PR/MR draft** sur GitHub/GitLab, et les contrats
  scratch `work-brief.json`, `codebase-map.json`, `docs-bundle.json`, `plan.json`,
  `manifest.json`. Avance optionnellement le ticket en `review`.

## Config

`providers.repository` (`github` | `gitlab`), `providers.tickets`, `providers.doc`,
`develop.mode`. Le token du code host vit dans `.env`, jamais dans la config ; owner/repo
viennent du remote git.

## Comportement

- `gate` (défaut) — s'arrête **au plan** pour validation humaine avant d'écrire.
- `autonomous` — va d'un trait jusqu'à la PR/MR draft.

Passe unique, pas de cap. Pas de verdict nommé (la PR/MR est la sortie). La PR reste
**draft** — le merge est humain, hors palette.

## Agents utilisés

[`snap-digest`](../agents.md#snap-digest) (haiku), [`snap-explorer`](../agents.md#snap-explorer)
(haiku), [`snap-docs`](../agents.md#snap-docs) (sonnet),
[`snap-planner`](../agents.md#snap-planner) (opus),
[`snap-developer`](../agents.md#snap-developer) (sonnet). En distant :
[`snap-loader`](../agents.md#snap-loader), [`snap-writer`](../agents.md#snap-writer).

## Chaîne

Alimente `/tests`, `/review`, `/qa` et `/fulldev`. C'est le point de **retour** de
`/fulldev` quand un gate revient rouge.
