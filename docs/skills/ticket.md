# `/ticket`

> Découpe les specs produit en backlog livrable versionné — Epics (un par Feature
> `specified`), Stories (avec critères d'acceptation tracés du PRD), Tasks techniques
> et Bugs — plus un Backlog et un Board régénérés.

## À quoi ça sert

Transforme les Features `specified` de la base produit en backlog Epics → Stories →
Tasks/Bugs sous `ticketsPath`. Les critères d'acceptation sont **tracés** (jamais
inventés) depuis le PRD de la Feature. Lint déterministe sur les deux racines (produit +
delivery), puis régénération de `BACKLOG.md` / `BOARD.md`.

## Invocation

```
/ticket                      # découpe chaque Feature specified sans Epic
/ticket FEAT-xxx             # découpe une Feature précise
/ticket epic|stories|tasks|bug|board
```

Sans argument : découpe toute Feature `specified` qui n'a pas encore d'Epic.

## Entrées / Sorties

- **Lit** : `snap.config.json` (`language`, `ticketsPath`, `docsPath`,
  `providers.tickets`), digest produit + delivery, le PRD des Features en scope,
  templates `templates/<type>.md`.
- **Écrit** : fichiers ticket `<ticketsPath>/<dir>/<ID>-<slug>.md`, `BACKLOG.md`,
  `BOARD.md`. En distant (Jira / GitHub Projects) : records via MCP/CLI + `state.json`.

## Config

`language`, `ticketsPath`, `docsPath`, `providers.tickets` (`github-projects` | `gitlab`
| `jira` | `repository`), `ticket.hierarchy`, bloc `remote.*` du provider.

## Comportement

Pas de mode gate/autonomous. Lint bloquant en sortie, corrigé dans la passe (pas de cap).
Round-trip distant identique à `/define` (load → fan-out → clôture).

## Agents utilisés

[`snap-drafter`](../agents.md#snap-drafter) (corps Epic/Story), et en distant
[`snap-loader`](../agents.md#snap-loader), [`snap-writer`](../agents.md#snap-writer).

## Étape suivante

`/wireframe` (conception) ou `/develop` (dév direct).
