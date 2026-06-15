# `/roadmap`

> Priorise le catalogue de features en **Maintenant / Ensuite / Plus tard** par rapport à
> la vision, en restreignant volontairement *Maintenant* et *Ensuite* pour livrer vite,
> puis régénère la vue roadmap.

## À quoi ça sert

Met de l'ordre dans le catalogue produit par rapport à la vision. La discipline centrale :
**garder *Maintenant* petit.** Le produit doit être livrable au plus vite — *Plus tard*
doit peser plus que *Maintenant* + *Ensuite* réunis (sauf objectif contraire de
l'utilisateur, alors tracé en décision).

- **Maintenant** — le plus petit ensemble qui livre un produit cohérent et utilisable qui
  bouge la métrique-étoile. Rien d'optionnel.
- **Ensuite** — la suite évidente une fois *Maintenant* en ligne, qui apprend du réel.
- **Plus tard** — tout le reste : confort, personas secondaires, mise à l'échelle, paris à
  valider. C'est là que vit la majorité du catalogue.

## Invocation

```
/roadmap
```

## Entrées / Sorties

- **Lit** : `snap.config.json` (`language`, `docsPath`, `providers.doc`), le digest d'état,
  le Brief (métrique-étoile + personas *Now*).
- **Écrit** : le champ `horizon` sur chaque `FEAT-*`, une fiche de décision (`ADR-*`) pour
  un choix de séquencement notable, le marqueur `roadmapReviewedAt`, puis régénère
  `ROADMAP.md` / `README.md`. La roadmap est une **vue générée**, jamais écrite à la main.

## Config

`language`, `docsPath`, `providers.doc` (`repository` | `notion`).

## Comportement

**Verrou d'entrée** : ≥ 1 feature au catalogue. Sinon la skill stoppe et **redirige vers
`/brainstorm`**. **Règle de restriction** : on pousse jusqu'à ce que *Plus tard* dépasse
*Maintenant* + *Ensuite*. Un test « Maintenant » : la feature sert la métrique-étoile **et**
un scénario clé d'un persona *Now* ne peut aboutir sans elle. Lint bloquant en sortie ; ne
touche jamais aux corps de feature (c'est `/define --spec`).

## Agents utilisés

Aucun agent dédié. En provider distant : [`snap-loader`](../agents.md#snap-loader),
[`snap-writer`](../agents.md#snap-writer).

## Étape suivante

`/define --spec` (spécifier les features *Maintenant*).
