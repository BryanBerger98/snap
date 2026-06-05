# `/define`

> Cadre le produit comme une base de connaissances Markdown versionnée, **une phase
> verrouillée à la fois** — Brief (PR-FAQ), Personas + Vision, et la spec détaillée d'une
> feature (PRD + enjeux techniques). Routeur : il aiguille vers `/brainstorm` et
> `/roadmap` quand c'est leur tour.

## À quoi ça sert

Transforme une intention produit en base **traçable** sous `docsPath`, sans foncer. Le
levier anti-précipitation, ce sont les **verrous** : une phase refuse de démarrer tant que
la précédente n'est pas finie et confirmée. `/define` possède trois phases ; les deux
autres (génération des features, priorisation) sont des skills sœurs.

- **Brief** (`-n`) — creuse l'idée brute : problème, pour qui, valeur en une phrase,
  métrique-étoile, non-buts, risque. Écrit **seulement** le Brief.
- **Vision** (`-v`) — personas (job à accomplir, douleurs, déclencheurs) + vision +
  **critère de succès**. Enrichit le Brief.
- **Spec + Tech** (`-s`) — une feature *Now* à la fois : PRD complet (parcours, user
  stories, critères d'acceptation testables) **puis** passe enjeux techniques (sécurité,
  résilience, données, performance, dépendances) → fiches de décision (ADR) + checklist.

## Invocation

```
/define                       # avance à la phase non satisfaite ; redirige vers /brainstorm ou /roadmap si c'est leur tour
/define -n | --new            # Brief (PR-FAQ)
/define -v | --vision         # Personas + vision + métrique de succès
/define -s | --spec [feature] # Spec détaillée d'une feature Now + enjeux techniques
```

Sans argument, le routeur lit l'état et entre dans la prochaine phase due : pas de
Brief → Brief ; Brief confirmé sans persona → Vision ; Brief + Vision mais aucune
feature → **stop, lance `/brainstorm`** ; features sans roadmap → **stop, lance
`/roadmap`** ; roadmap passée + feature *Now* non spécifiée → Spec + Tech.

## Entrées / Sorties

- **Lit** : `snap.config.json` (`language`, `docsPath`, `providers.doc`), le digest d'état
  (frontmatter seul) injecté automatiquement, `.snap/define-progress.json` (signaux de
  verrou), les templates partagés `templates/product-model/<type>.md`.
- **Écrit** : `BRF-001`, `PER-*`, `FEAT-*` (`specified`), `ADR-*` sous
  `<docsPath>/<dir>/<ID>-<slug>.md`, puis régénère `INDEX.md` / `ROADMAP.md`. En provider
  distant (Notion / AFFiNE) : pages/records via MCP + scratch `.snap/tmp/state.json`.

## Config

`language`, `docsPath`, `providers.doc` (`repository` | `notion` | `affine`), `define.*`,
et le bloc `remote.*` du provider distant choisi.

## Comportement

**Phases verrouillées.** Les verrous lisent l'état des entités + deux signaux non
dérivables (`briefConfirmedAt`, `roadmapReviewedAt`) dans `.snap/define-progress.json`. Un
verrou non satisfait **stoppe et nomme la skill à lancer** — jamais de construction sur une
base non confirmée. `/define` **redirige par message**, n'auto-appelle pas les skills
sœurs (contexte propre).

Le **lint est bloquant** : une ERROR force la correction avant de finir (pas de cap
d'itération). En provider distant, un **round-trip** garantit la cohérence (pré-chargement,
fan-out 1 agent/entité, passe 2 de liens Notion, re-lecture de clôture).

## Agents utilisés

[`snap-drafter`](../agents.md#snap-drafter) (corps longs de PRD), `Explore` (audit
brownfield), et en distant [`snap-loader`](../agents.md#snap-loader),
[`snap-writer`](../agents.md#snap-writer), [`snap-linker`](../agents.md#snap-linker).

## Étape suivante

Après le Brief → `/define --vision` → `/brainstorm` → `/roadmap` → `/define --spec` →
`/ticket`.
