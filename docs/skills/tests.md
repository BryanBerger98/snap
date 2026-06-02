# `/tests`

> Écrit les tests dont un changement a besoin — depuis les critères d'acceptation d'un
> ticket OU un diff local / une PR/MR — puis les lance et **boucle jusqu'au vert** en
> réparant **uniquement les tests, jamais la source**.

## À quoi ça sert

Résout la cible (diff local, diff PR/MR, ou CA d'un ticket), cartographie le runner de
tests, planifie la couverture **par critère d'acceptation** (pas par ligne), puis fait un
fan-out d'**un tester par niveau activé** (unit/integration/e2e) qui écrit de vrais
fichiers de test. Lance la suite ; sur échec, un triage classe chaque échec :

- `test-bug` → re-spawn du tester pour corriger le test, puis relance ;
- `source-bug` → **sort de la boucle** (le code est faux, jamais corrigé ici).

## Invocation

```
/tests                       # diff local
/tests 42                    # PR/MR
/tests STORY-003             # CA du ticket
/tests [...] --base <branch> --levels u,i,e --mode gate|autonomous
```

`--levels` = CSV unit/integration/e2e (surcharge `tests.levels`). `--mode` gate
l'écriture seule.

## Entrées / Sorties

- **Lit** : `snap.config.json` (`providers.repository`, `providers.tickets`, `tests.*`,
  `develop.mode`), git diff ou ticket, `work-brief.json` (CA), `codebase-map.json` (runner).
- **Écrit** : fichiers de test dans le repo (conventions du runner) ; `tests-target.json`,
  `tests-{unit,integration,e2e}.json`, `triage.json`, `tests-report.json` ;
  `tests-report-<id>.md` (local) ou commits poussés sur la branche de la PR (mode `pr`).

## Config

`providers.repository`, `providers.tickets`, `tests.levels` (défaut
`unit,integration,e2e`), `tests.mode` (fallback `develop.mode`), `tests.maxIterations`
(défaut `3`).

## Comportement & verdict

`gate` s'arrête avant d'écrire pour valider le plan ; `autonomous` enchaîne. Boucle au
vert bornée par `maxIterations` (défaut 3) — les test-bugs restants au plafond sont loggés
comme **dette de test** (jamais tronqué en silence).

| Verdict | Condition |
| --- | --- |
| `passed` | toutes les CA couvertes, aucun source-bug |
| `tests-failed` | source-bug détecté ou CA non couvrable → `/fulldev` renvoie sur `/develop` |

**Couverture = CA, pas lignes. Ne touche jamais la source.**

## Agents utilisés

[`snap-tester`](../agents.md#snap-tester) (sonnet, un par niveau + mode fix),
[`snap-test-triage`](../agents.md#snap-test-triage) (sonnet, read-only) ;
[`snap-digest`](../agents.md#snap-digest) (CA), [`snap-explorer`](../agents.md#snap-explorer)
(runner), [`snap-loader`](../agents.md#snap-loader) (ticket distant).
