# `/snap:init`

> Initialise ou reconfigure la config Snap (`snap.config.json`) : langue des
> artefacts, chemins des docs, providers, modes, et garde-fous secrets.

## À quoi ça sert

Assistant interactif qui crée `snap.config.json` à la racine du projet et installe
les garde-fous secrets (`.env.example` + `.env` ajouté au `.gitignore`). À lancer
une fois quand on adopte Snap dans un repo, ou plus tard pour changer la config.

Le hook `SessionStart` pose déjà des défauts en silence au premier démarrage ;
`/snap:init` te laisse **choisir** (langue, `docsPath`, providers, modes…) et provisionne
les backends distants si besoin.

## Invocation

```
/snap:init
```

Aucun argument — toutes les valeurs sont collectées en interactif.

## Ce qu'il écrit

- `snap.config.json` — config versionnée, partagée par l'équipe (via `init-config.mjs`).
- `.env.example` — gabarit de secrets.
- garde-fou : `.env` ajouté au `.gitignore`.

Pour un provider distant (Notion / AFFiNE / Jira / GitHub Projects), il lance
[`snap-provisioner`](../agents.md#snap-provisioner) qui prépare la structure
(bases Notion, vues…) et renvoie des **locators** (jamais de token) fusionnés dans la config.

## Config touchée

Toute la config : `language`, `docsPath`, `ticketsPath`, `providers.*`, et les blocs
`develop` / `review` / `tests` / `qa` / `fulldev` (modes, niveaux, caps, surfaces).

## Comportement

Passe unique, **idempotent** : relancer est sûr et signale « inchangé » quand rien ne bouge.
La config finale est validée contre [`snap.config.schema.json`](../../snap.config.schema.json).

## Étape suivante

`/define`.
