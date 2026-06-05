# Documentation Snap

Snap est un plugin Claude Code qui outille la chaîne **produit → conception →
développement → livraison**. Chaque étape est une *skill* invocable au `/` qui
transforme une intention produit en artefacts versionnés, puis en code livré.

Cette doc décrit **comment utiliser chaque skill** et **le rôle de chaque agent**.

- 📦 Installation et premier setup → [README racine](../README.md)
- 🧩 Les skills, une par une → [`skills/`](skills/README.md)
- 🤖 Les agents (subagents) et leur rôle → [`agents.md`](agents.md)

## La chaîne

```
 PRODUIT            CONCEPTION (outil design via MCP)        DÉV        QUALITÉ
┌─────────┐        ┌──────────┬──────┬──────────┐        ┌─────────┐  ┌────────────────────┐
│ /define │──┐     │/wireframe│ /ds  │ /design  │   ┌───▶│/develop │─▶│ /tests   /review   │
└─────────┘  ├────▶└──────────┴──────┴──────────┘   │    └─────────┘  │     │       │       │
┌─────────┐  │              │                       │         ▲       │     └──┬────┘       │
│ /ticket │──┘              └───────────────────────┘         │       │   tous verts ▼      │
└─────────┘                                                   │       │        /qa          │
                                                              │       └────────────────────┘
                                                              │  rouge = retour /develop
                                                              └──────────── /fulldev ────────
```

- **Produit** — [`/define`](skills/define.md) cadre le produit en phases verrouillées
  (Brief PR-FAQ → Vision → Spec + ADR) ; [`/brainstorm`](skills/brainstorm.md) génère le
  catalogue de features ; [`/roadmap`](skills/roadmap.md) priorise Maintenant/Ensuite/Plus
  tard ; [`/ticket`](skills/ticket.md) découpe en backlog livrable.
- **Conception** — [`/wireframe`](skills/wireframe.md) (Lo-Fi), [`/ds`](skills/ds.md)
  (design system), [`/design`](skills/design.md) (Hi-Fi) — **dans Penpot ou Figma via
  MCP**, l'outil design est la source de vérité (rien dans le repo).
- **Développement** — [`/develop`](skills/develop.md) transforme un ticket en code sur
  une branche + PR/MR draft.
- **Qualité** — [`/review`](skills/review.md) (revue de diff), [`/tests`](skills/tests.md)
  (écrit et boucle les tests au vert), [`/qa`](skills/qa.md) (lance l'app et valide les
  critères d'acceptation en live).
- **Orchestration** — [`/fulldev`](skills/fulldev.md) enchaîne develop → tests → review →
  qa en boucle bornée jusqu'au vert. C'est le **seul boucleur** de la palette.
- **Setup** — [`/snap:init`](skills/init.md) crée/reconfigure `snap.config.json`.

## Principes d'architecture

- **Cœur déterministe** — la logique sensible (lint, machine à états, bootstrap config)
  vit dans des scripts Node `.mjs` sans dépendances, cross-platform. Les agents portent
  les I/O et le jugement.
- **Contrats scratch** — les skills communiquent par petits fichiers JSON sous
  `.snap/tmp/` (jamais commités), pas par contexte partagé.
- **Multi-provider exclusif** — un provider par domaine : tickets (GitHub Projects /
  GitLab / Jira), docs (repository / Notion / AFFiNE), design (Penpot / Figma), code host
  (GitHub / GitLab). Réglé dans `snap.config.json`.
- **Secrets hors config** — aucun token dans `snap.config.json` ni `.mcp.json` ; les
  secrets vont dans `.env` (gitignored).
