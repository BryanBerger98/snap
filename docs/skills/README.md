# Skills

Une skill = une commande `/` du plugin. Elles s'enchaînent mais restent invocables
indépendamment.

## Comment les invoquer

Tape la forme courte : `/define`, `/ticket`, `/develop`, …

Si le nom entre en collision avec une autre skill installée, utilise la forme
**qualifiée** `/snap:<skill>` (toujours valable). La skill de config s'invoque
toujours `/snap:init`.

La plupart des skills acceptent un **argument** qui restreint la cible (un id
d'entité, un numéro de PR/MR, un sous-domaine). Sans argument, elles prennent un
défaut raisonnable (souvent : tout ce qui est en attente).

## Palette

| Skill | Phase | Rôle | Boucle ? |
| --- | --- | --- | --- |
| [`/snap:init`](init.md) | Setup | Crée / reconfigure `snap.config.json` | — |
| [`/define`](define.md) | Produit | Base produit en phases verrouillées (Brief, Vision, Spec + Tech) | — |
| [`/brainstorm`](brainstorm.md) | Produit | Génère le catalogue de features (divergence proactive → stubs) | — |
| [`/roadmap`](roadmap.md) | Produit | Priorise le catalogue en Maintenant / Ensuite / Plus tard | — |
| [`/ticket`](ticket.md) | Produit | Backlog livrable (Epics → Stories → Tasks/Bugs) | — |
| [`/wireframe`](wireframe.md) | Conception | Wireframes Lo-Fi dans l'outil design (MCP) | — |
| [`/ds`](ds.md) | Conception | Design system dans l'outil design (MCP) + codec code | — |
| [`/design`](design.md) | Conception | Maquettes Hi-Fi composées du DS (MCP) | — |
| [`/develop`](develop.md) | Dév | Un ticket → code sur branche + PR/MR draft | — |
| [`/review`](review.md) | Qualité | Revue de diff (4 dimensions ∥) | passe unique |
| [`/tests`](tests.md) | Qualité | Écrit les tests, boucle au vert | ✅ jusqu'au vert |
| [`/qa`](qa.md) | Qualité | Lance l'app, valide les CA en live | passe unique |
| [`/fulldev`](fulldev.md) | Orchestration | develop → tests ∥ review → qa en boucle | ✅ seul boucleur |

## Verdicts (skills qualité)

Les skills qualité émettent un verdict que `/fulldev` lit pour décider de la suite :

| Skill | Vert | Rouge → action |
| --- | --- | --- |
| `/review` | `approve` | `changes-requested` (≥1 blocker/major) → retour `/develop` |
| `/tests` | `passed` | `tests-failed` (source-bug ou CA non couvrable) → retour `/develop` |
| `/qa` | `accepted` | `rejected` (un CA `partial`/`unmet`) → retour `/develop` |
| `/fulldev` | `done-green` | `stopped-budget` / `stopped-blocked` → intervention humaine |
