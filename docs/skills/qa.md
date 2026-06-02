# `/qa`

> Valide que les critères d'acceptation d'un ticket sont **réellement** remplis par le
> produit livré — en **lançant l'app réelle** et en exerçant chaque critère en live.
> Verdict binaire (`accepted` | `rejected`) + matrice de preuves par CA, et transition
> du ticket.

## À quoi ça sert

Résout un ticket (obligatoire ; abort sinon), extrait ses critères d'acceptation comme
étalon, cartographie comment lancer l'app, planifie quel CA va sur quelle surface, puis
**boote l'app** (ou réutilise une URL fournie) sur un profil test/staging. Fan-out d'**un
validator par surface** (web / api / cli) en parallèle ; chacun exerce ses CA
**séquentiellement** contre l'instance live et capture des preuves. Le **teardown tourne
toujours** (try/finally). Synthétise une matrice par CA, poste un commentaire QA au ticket
et transitionne son statut.

## Invocation

```
/qa                          # ticket déduit de la branche/PR courante
/qa STORY-003                # CA de ce ticket
/qa 42                       # ticket lié à la PR/MR
/qa [...] --base-url <url> --surfaces web,api,cli --mode gate|autonomous
```

`--base-url` réutilise une instance lancée. `--surfaces` surcharge `qa.surfaces`.

## Entrées / Sorties

- **Lit** : `snap.config.json` (`providers.*`, `qa.*`, `develop.mode`), ticket,
  `work-brief.json` (CA), `codebase-map.json` (commande de run, port, health, surfaces).
- **Écrit** : `qa-target.json`, `qa-{web,api,cli}.json`, `qa-evidence/` (captures,
  dumps HTTP/CLI), `qa-report.json`, `qa-report-<id>.md` ; commentaire QA au ticket +
  transition optionnelle de statut.

## Config

`providers.repository`, `providers.tickets`, `qa.surfaces` (défaut `web,api,cli`),
`qa.mode` (fallback `develop.mode`), `qa.run` (`cmd`, `url`, `readyWhen`, `teardown`),
`qa.transitions`.

## Comportement & verdict

`gate` s'arrête avant de booter l'app ; `autonomous` enchaîne. **Passe unique** — pas de
`qa.maxIterations`. ⚠️ **Jamais d'URL de prod** (test/staging seulement).

| Verdict | Condition |
| --- | --- |
| `accepted` | toutes les CA en scope `met` |
| `rejected` | un CA `partial` ou `unmet` → `/fulldev` renvoie sur `/develop` |

**N'écrit jamais la source.**

## Agents utilisés

[`snap-qa-validator`](../agents.md#snap-qa-validator) (sonnet, un par surface) ;
[`snap-digest`](../agents.md#snap-digest) (CA),
[`snap-explorer`](../agents.md#snap-explorer) (commande de run),
[`snap-loader`](../agents.md#snap-loader) (ticket distant).
