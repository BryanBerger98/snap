# `/fulldev`

> Orchestre la chaîne de livraison complète d'un ticket — develop → tests → review →
> qa — en **boucle bornée** jusqu'à ce que tous les gates soient verts ou que le budget
> soit épuisé. Pilote les sous-skills et lit leurs verdicts ; ne touche jamais la source
> ni les gates, ne merge jamais.

## À quoi ça sert

Le **seul orchestrateur boucleur** de la palette. Détecte le point d'entrée (une PR/MR
existe déjà → démarre aux gates ; sinon → `/develop` d'abord), puis déroule une boucle
bornée :

```
/develop → /tests ∥ /review → (si les deux verts) /qa
                 ▲                                  │
                 └──────── tout rouge renvoie ──────┘
```

`/qa` n'est lancé **que** si `/tests` et `/review` sont verts (booter l'app coûte cher).
L'état de la boucle est **100 % déterministe**, géré par `scripts/fulldev-state.mjs`.

## Invocation

```
/fulldev                     # ticket déduit de la branche/PR
/fulldev STORY-003 | 42
/fulldev [...] --mode gate|autonomous --max-cycles N --max-per-gate K --base-url <url>
```

`--mode` **surcharge le mode de toutes les sous-skills**. `--max-cycles` = plafond global
de passes `/develop`. `--max-per-gate` = nombre de rouges avant qu'un gate soit **bloqué**.

## Entrées / Sorties

- **Lit** : `snap.config.json` (`providers.repository`, `fulldev.*`, `qa.run.url`), ticket,
  `work-brief.json` (CA), les verdicts des sous-skills (`tests-report.json`,
  `qa-report.json`, rapport `/review`), `fulldev-state.json`.
- **Écrit** : `fulldev-state.json`, `fulldev-report.json`, `fulldev-report-<id>.md` ;
  commentaire de synthèse d'orchestration au ticket (idempotent). La PR/MR draft est
  produite par `/develop` et **laissée en draft**.

## Config

`providers.repository`, `fulldev.mode` (défaut `gate`), `fulldev.maxCycles` (défaut `5`),
`fulldev.maxPerGate` (défaut `3`), `qa.run.url`.

## Comportement & verdicts terminaux

`gate` s'arrête pour valider le plan avant de démarrer (et chaque sous-skill garde son
propre gate) ; `autonomous` enchaîne de bout en bout. Une nouvelle passe `/develop`
**remet à `pending`** les gates précédemment verts ; un gate bloqué est skippé.

| Verdict | Condition |
| --- | --- |
| `done-green` | tous les gates verts |
| `stopped-budget` | `maxCycles` épuisé |
| `stopped-blocked` | ≥1 gate a atteint `maxPerGate` rouges |

**Ne merge jamais** — la PR draft est laissée pour un humain. Sur arrêt, tous les
bloqueurs sont remontés.

## Agents utilisés

Aucun agent de gate en propre : tout le travail est délégué aux sous-skills (`/develop`,
`/tests`, `/review`, `/qa`) via le Skill tool. Utilise seulement
[`snap-digest`](../agents.md#snap-digest) (CA) et
[`snap-loader`](../agents.md#snap-loader) (ticket distant).
