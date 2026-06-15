# Snap

Chaîne **produit → conception → développement → livraison** pour équipes logicielles,
livrée comme un plugin Claude Code. Snap expose une palette de skills invocables au `/`
qui transforment une intention produit en artefacts versionnés, puis en code livré.

```
/define → /brainstorm → /roadmap → /ticket → /wireframe → /ds → /design → /develop → /tests · /review · /qa
└──────────── produit ────────────┘   └──── conception (Penpot/Figma via MCP) ────┘  └ dév ┘  └── qualité ──┘

        /fulldev orchestre develop → (tests ∥ review) → qa en boucle jusqu'au vert
```

> **v2.2.0 — définition produit en phases verrouillées.** Les 13 skills sont livrées :
> `/snap:init`, `/define`, `/brainstorm`, `/roadmap`, `/ticket`, `/wireframe`, `/ds`,
> `/design`, `/develop`, `/review`, `/tests`, `/qa`, `/fulldev`. La définition produit est
> découpée en phases verrouillées : `/define` cadre (Brief → Vision → Spec), `/brainstorm`
> génère le catalogue de features, `/roadmap` priorise. La config est posée **manuellement**
> via `/snap:init` (plus aucun hook au démarrage).

## Installation

```text
/plugin marketplace add BryanBerger98/claude-plugins
/plugin install snap@bryanberger
```

> La marketplace s'ajoute depuis le repo `BryanBerger98/claude-plugins`. L'alias
> `bryanberger` (défini dans son `marketplace.json`) sert à `snap@bryanberger`.

Développement local (sans installer) :

```bash
claude --plugin-dir ./snap                 # charge le plugin
claude plugin validate ./snap --strict     # valide le manifeste
```

## Premier setup

La mise en place est **manuelle et explicite** — rien ne s'exécute au démarrage, donc
Snap n'écrit jamais de config dans un projet qui ne l'utilise pas. Pour adopter Snap dans
un repo, lance :

```text
/snap:init
```

L'assistant interactif crée à la racine du projet :

- `snap.config.json` — config versionnée, partagée par l'équipe (langue, chemins,
  providers, modes). Schéma : [`snap.config.schema.json`](snap.config.schema.json).
- `.env.example` — gabarit de secrets.
- garde-fou : `.env` ajouté au `.gitignore` (anti-fuite — aucun token ne va dans la config).

Idempotent — relancer est sûr. Détails : [`docs/skills/init.md`](docs/skills/init.md).
(Chaque skill répare aussi une config manquante en silence, mais les valeurs choisies
viennent de `/snap:init`.)

## Utilisation

Chaque skill est une commande `/` autonome, mais elles s'enchaînent. Tape la forme courte
(`/define`) ; en cas de collision avec une autre skill, utilise `/snap:<skill>`.

| Skill | Rôle |
| --- | --- |
| [`/define`](docs/skills/define.md) | Base produit en phases verrouillées (Brief PR-FAQ → Vision → Spec + ADR) |
| [`/brainstorm`](docs/skills/brainstorm.md) | Génère le catalogue de features (diverger puis converger) |
| [`/roadmap`](docs/skills/roadmap.md) | Priorise Maintenant / Ensuite / Plus tard (biais *Plus tard*) |
| [`/ticket`](docs/skills/ticket.md) | Backlog livrable (Epics → Stories → Tasks/Bugs) |
| [`/wireframe`](docs/skills/wireframe.md) | Wireframes Lo-Fi dans l'outil design (MCP) |
| [`/ds`](docs/skills/ds.md) | Design system dans l'outil design (MCP) + codec de tokens |
| [`/design`](docs/skills/design.md) | Maquettes Hi-Fi composées du DS (MCP) |
| [`/develop`](docs/skills/develop.md) | Un ticket → code sur branche + PR/MR draft |
| [`/review`](docs/skills/review.md) | Revue de diff (4 dimensions en parallèle) |
| [`/tests`](docs/skills/tests.md) | Écrit les tests et boucle jusqu'au vert |
| [`/qa`](docs/skills/qa.md) | Lance l'app et valide les critères d'acceptation en live |
| [`/fulldev`](docs/skills/fulldev.md) | Orchestre develop → tests ∥ review → qa en boucle |

📖 **Documentation complète** : [`docs/`](docs/README.md) — une page par skill et le rôle
de chaque [agent](docs/agents.md).

## Configuration

Tout vit dans `snap.config.json` (versionné, partagé). Multi-provider **exclusif** — un
provider par domaine :

| Domaine | Clé | Choix |
| --- | --- | --- |
| Docs produit | `providers.doc` | `repository` · `notion` |
| Tickets | `providers.tickets` | `github-projects` · `gitlab` · `jira` · `repository` |
| Design | `providers.design` / `providers.wireframe` | `penpot` · `figma` (via MCP) |
| Code host | `providers.repository` | `github` · `gitlab` |

Modes des skills dév/qualité (`develop`, `tests`, `qa`, `review`, `fulldev`) : `gate`
(s'arrête pour validation humaine) ou `autonomous`. Les secrets (tokens) vont dans `.env`,
**jamais** dans `snap.config.json` ni `.mcp.json`.

## Architecture

- `.claude-plugin/` — manifeste du plugin (`plugin.json`).
- `.mcp.json` — serveurs MCP des outils design (`snap-penpot`, `snap-figma`) pilotés par
  `/wireframe`, `/ds` et `/design` ; URLs surchargeables par variables d'env.
- `skills/` — un dossier par skill (`<skill>/SKILL.md` + templates éventuels).
- `agents/` — 18 subagents (`snap-*`), modèle choisi par tâche (haiku/sonnet/opus). Voir
  [`docs/agents.md`](docs/agents.md).
- `reference/` — guides chargés à la demande par les skills (pipelines, conventions,
  persistance par provider).
- `scripts/` — cœur déterministe Node (`.mjs`, cross-platform, sans dépendances) :
  `bootstrap-config` (défauts minimaux, appelé par `/snap:init` et en auto-réparation),
  `init-config` (setup interactif), `fulldev-state` (machine à états de la boucle), et
  `lib/` (frontmatter, entités).
- `plan/` — décisions (ADR léger), specs techniques.

## Licence

[MIT](LICENSE) © 2026 Bryan Berger
