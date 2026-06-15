# `/brainstorm`

> Remplit le catalogue de features (stubs) de façon **proactive** : génère des idées à
> partir des douleurs des personas, des jobs adjacents et des patterns concurrents, puis
> converge en ne gardant que ce qui sert une vraie douleur.

## À quoi ça sert

Le moment créatif de la définition produit. Contrairement au monolithe d'avant, la skill
**contribue** des idées au lieu de seulement transcrire les tiennes :

1. **Diverger** — génère large (matrice douleur × persona, jobs juste avant/après le job
   central, ce que font les produits voisins, cas limites : onboarding, erreurs, échelle).
   On ne filtre pas pendant qu'on génère.
2. **Converger** — chaque feature survivante doit servir une douleur de persona nommée ;
   le reste est coupé ou parqué. Chaque survivante reçoit une hypothèse de valeur.
3. **Écrire** — des **stubs** : une ligne chacune (titre + persona + hypothèse de valeur).
   Aucun corps détaillé (ça, c'est `/define --spec`, plus tard).

## Invocation

```
/brainstorm
```

## Entrées / Sorties

- **Lit** : `snap.config.json` (`language`, `docsPath`, `providers.doc`), le digest d'état,
  le Brief + les personas, le template partagé `templates/product-model/feature.md`.
- **Écrit** : `FEAT-*` (`depth: stub`) sous `<docsPath>/03-features/<domain>/`, puis régénère
  `README.md` / `ROADMAP.md`. La priorisation (`horizon`) n'est **pas** faite ici.

## Config

`language`, `docsPath`, `providers.doc` (`repository` | `notion`).

## Comportement

**Verrou d'entrée** : Brief confirmé **et** ≥ 1 persona. Sinon la skill stoppe et
**redirige vers `/define`** (`--new` puis `--vision`) — on ne brainstorme pas dans le vide.
**Diverger avant converger** est la règle : une liste courte, déjà filtrée, est
l'anti-pattern. Lint bloquant en sortie.

## Agents utilisés

Aucun agent dédié (peut utiliser `WebSearch` / `WebFetch` pour le scan concurrents). En
provider distant : [`snap-loader`](../agents.md#snap-loader),
[`snap-writer`](../agents.md#snap-writer).

## Étape suivante

`/roadmap` (prioriser le catalogue).
