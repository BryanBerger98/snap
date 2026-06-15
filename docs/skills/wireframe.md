# `/wireframe`

> Transforme les Features `specified` et leurs Stories en wireframes Lo-Fi créés
> directement dans l'outil design (Penpot ou Figma) via son serveur MCP — un board
> par écran, des frames par zone, des labels placeholder, des boards séparés par état.

## À quoi ça sert

Dérive les écrans depuis le user flow de chaque Feature `specified` et leurs états
depuis les Stories, puis dessine des boards Lo-Fi (boîtes et labels en niveaux de gris,
aucun style) dans Penpot ou Figma via MCP. **Rien n'est écrit dans le repo** : l'outil
design est la source de vérité.

## Invocation

```
/wireframe                   # toute Feature specified avec user flow
/wireframe FEAT-xxx | STORY-xxx | <nom d'écran>
```

## Entrées / Sorties

- **Lit** : `snap.config.json` (`providers.wireframe`, `wireframe.*`), les Features
  `specified` (user flow numéroté du PRD), les Stories (critères → états d'écran).
- **Écrit** : des boards Lo-Fi dans l'outil design via MCP. Nommés `WF · <écran> · <état>`,
  avec traçabilité `FEAT-*` / `STORY-*` dans la description. **Rien dans le repo.**

## Config

`providers.wireframe` (`penpot` | `figma`), `wireframe.fidelity`, `wireframe.target`.

## Comportement

Passe unique, **idempotent** (un board de même nom est mis à jour, pas dupliqué).
**Arrêt net** si le MCP est injoignable — la skill explique au lieu d'écrire dans le repo.

## Agents utilisés

[`snap-drafter`](../agents.md#snap-drafter) (optionnel, plan d'écrans des gros flows).
L'authoring MCP reste dans le contexte principal.

## Étape suivante

`/ds` puis `/design`.
