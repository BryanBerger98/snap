# Snap

Chaîne **produit → conception → développement → livraison** pour équipes logicielles,
livrée comme un plugin Claude Code. Snap expose une palette de skills invocables au `/`
qui transforment une intention produit en artefacts versionnés, puis en code livré.

> **État : v0.1.0 — P0/P1/P2/P3/P4/P5.** Squelette validable, plus les skills `/define`
> (cadrage produit), `/ticket` (découpe en backlog de livraison), `/wireframe` (wireframes
> Lo-Fi dans l'outil design, via MCP), `/ds` (design system dans l'outil via MCP, ponté au
> code) et `/design` (maquettes Hi-Fi composées du DS, dans l'outil via MCP). La palette
> s'étend skill par skill. Voir [`plan/`](plan/) pour les décisions et les specs techniques.

## Périmètre v1

La v1 livre **`/define`** (cadrage produit), **`/ticket`** (backlog de livraison),
**`/wireframe`** (wireframes Lo-Fi), **`/ds`** (design system) et **`/design`** (maquettes
Hi-Fi), puis la palette s'étend skill par skill : `/develop`, `/review`, `/tests`, `/qa`,
`/fulldev`.

- **`/define`** écrit une base de connaissances Markdown versionnée (modèle d'entités
  D-019) : Brief (PR-FAQ) → Personas → Features (catalogue + PRD) → Décisions (ADR),
  avec frontmatter traçable et des vues régénérées (`INDEX.md`, `ROADMAP.md`).
- **`/ticket`** découpe les Features `specified` en tickets (Epic → Story → Task/Bug)
  sous `docs/delivery/`, avec liens tracés vers les Features et des vues régénérées
  (`BACKLOG.md`, `BOARD.md`).
- **`/wireframe`** dessine les écrans (Features) et leurs états (Stories) en wireframes
  Lo-Fi **directement dans Penpot ou Figma** via le MCP de l'outil — aucun fichier dans le
  repo : l'outil design est la source de vérité (provider réglé par `providers.wireframe`).
- **`/ds`** construit le **design system** dans l'outil via MCP (tokens en styles de
  librairie, tiers primitive→semantic→component ; composants avec variants/états bindés aux
  tokens) — l'outil est la source de vérité (`providers.design`). Il **ponte au code** :
  `import` amorce le DS depuis le code existant, `export` émet tokens (DTCG + CSS + Tailwind)
  et un manifeste de composants dans l'app, via un codec déterministe sans dépendances.
- **`/design`** compose les **maquettes Hi-Fi** dans l'outil via MCP en assemblant le design
  system (`/ds`), la structure (`/wireframe`) et le contenu (`/define`/`/ticket`) : instances
  de composants + token styles + contenu réel + tous les états. Structure **hybride** (upgrade
  le board `/wireframe` s'il existe, sinon dérive du user-flow), interactivité **configurable**
  (`design.interactive` : `static` par défaut, `prototype` pour un prototype cliquable). Même
  clé `providers.design` que `/ds` ; un composant manquant est routé vers `/ds`.

## Installation (équipe)

```bash
/plugin marketplace add <org>/snap
/plugin install snap@snap
```

Développement local :

```bash
claude --plugin-dir ./snap          # charge le plugin sans l'installer
claude plugin validate ./snap --strict
```

## Configuration

Au premier démarrage, le hook `SessionStart` crée à la racine du projet :

- `snap.config.json` — config versionnée, partagée par l'équipe (langue, `docsPath`,
  providers, comportement de `/define`). Schéma : [`snap.config.schema.json`](snap.config.schema.json).
- `.env.example` — gabarit de secrets (aucun requis pour `/define` v1).
- garde-fou : `.env` est ajouté au `.gitignore` du projet (anti-fuite).

Pour un setup **interactif** (choisir la langue et le `docsPath`, ou reconfigurer), lance :

```bash
/snap:init
```

Idempotent — le hook pose les défauts en silence, `/snap:init` te laisse choisir.

## Architecture

- `.claude-plugin/` — manifeste + marketplace.
- `.mcp.json` — serveurs MCP des outils design (`snap-penpot`, `snap-figma`) que
  `/wireframe` (clé `providers.wireframe`) et `/ds` + `/design` (clé `providers.design`)
  pilotent ; URLs surchargeables par variables d'env, le serveur inutilisé est inerte.
- `skills/` — un dossier par skill (`init/` amorçage config, `define/` cadrage produit,
  `ticket/` découpe en backlog, `wireframe/` wireframes Lo-Fi via MCP, `ds/` design system
  via MCP + codec de tokens `tokens-codec.mjs`, `design/` maquettes Hi-Fi via MCP composées
  du DS).
- `agents/` — subagents (`snap-drafter`).
- `hooks/` — `SessionStart` → bootstrap de la config.
- `scripts/` — utilitaires Node (`.mjs`, cross-platform) : `bootstrap-config`,
  `init-config`, et `lib/frontmatter.mjs` (parser YAML partagé par les skills).
- `plan/` — décisions (ADR léger), specs techniques, diagrammes d'architecture.

## Licence

[MIT](LICENSE) © 2026 Bryan Berger
