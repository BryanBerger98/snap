# `/review`

> Revoit un changement pour correctness, sécurité, conventions et qualité — sur un
> diff local OU une pull/merge request. Fan-out de 4 reviewers en parallèle, synthèse
> classée par sévérité, livraison sur le canal naturel (commentaires inline PR/MR, ou
> rapport local). Read-only par défaut ; `--fix` applique les correctifs faisables.

## À quoi ça sert

Résout la cible du diff (working tree local, un numéro de PR/MR, ou la PR/MR liée à un
ticket), lance **4 subagents reviewers en parallèle** sur des dimensions configurables,
dédoublonne et trie les findings par sévérité (`blocker` / `major` / `minor` / `nit`),
puis livre :

- **cible PR/MR** → commentaires inline + commentaire de synthèse via `gh` / `glab` ;
- **diff local** → rapport Markdown `.snap/tmp/review-<id>.md`.

## Invocation

```
/review                      # diff local (working tree)
/review 42 | #42 | !7        # une PR/MR précise
/review STORY-003            # la PR/MR liée au ticket
/review [...] --base <branch> --fix --mode gate|autonomous
```

`--base` surcharge la ref de base. `--fix` applique les findings `fixable`. `--mode` ne
gate **que** l'étape `--fix` (la revue elle-même ne s'arrête jamais avant les findings).

## Entrées / Sorties

- **Lit** : `snap.config.json` (`providers.repository`, `review.dimensions`), le git diff
  (local ou `gh pr diff` / `glab mr diff`), `manifest.json` (résolution ticket → PR/MR),
  `work-brief.json` (CA du ticket comme lentille de revue).
- **Écrit** : `review-target.json`, `findings-{correctness,security,conventions,quality}.json`,
  `review-report.json` ; commentaires PR/MR **ou** `review-<id>.md` ; `fix-manifest.json`
  (avec `--fix` seulement).

## Config

`providers.repository`, `review.dimensions` (défaut : les 4 — `correctness`, `security`,
`conventions`, `quality`).

## Comportement & verdict

Revue toujours en **passe unique**. Gate `--fix` : `gate` s'arrête pour validation avant
d'appliquer ; `autonomous` saute l'arrêt.

| Verdict | Condition |
| --- | --- |
| `approve` | aucun finding blocker/major |
| `changes-requested` | ≥1 blocker ou major → `/fulldev` renvoie sur `/develop` |

**N'approuve jamais, ne merge jamais.**

## Agents utilisés

[`snap-reviewer-correctness`](../agents.md#snap-reviewer-correctness) (opus),
[`snap-reviewer-security`](../agents.md#snap-reviewer-security) (sonnet),
[`snap-reviewer-conventions`](../agents.md#snap-reviewer-conventions) (haiku),
[`snap-reviewer-quality`](../agents.md#snap-reviewer-quality) (sonnet) ;
[`snap-fixer`](../agents.md#snap-fixer) (sonnet, avec `--fix`) ;
[`snap-digest`](../agents.md#snap-digest) (optionnel, contexte ticket).
