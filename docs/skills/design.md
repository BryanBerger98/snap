# `/design`

> Transforme les Features `specified` et leurs Stories en maquettes Hi-Fi complètes
> dans l'outil design (Penpot ou Figma) via MCP, en composant le design system de
> `/ds` — contenu réel, style réel, tous les états. Interactivité optionnelle
> (prototype cliquable).

## À quoi ça sert

Compose des maquettes Hi-Fi à partir du design system (instances de composants `/ds` +
token styles) et du contenu produit réel (PRD). Structure **hybride** : met à niveau le
board `/wireframe` correspondant s'il existe, sinon dérive la mise en page du user flow.
Un board par écran par état, nommé `HI · <écran> · <état>`. Un composant manquant est
**routé vers `/ds`** au lieu d'être créé inline.

## Invocation

```
/design                      # toute Feature specified avec user flow
/design FEAT-xxx | STORY-xxx | <nom d'écran>
```

## Entrées / Sorties

- **Lit** : `snap.config.json` (`providers.design`, `design.*`), Features `specified`
  (user flow + copy réelle du PRD), Stories (états), boards Lo-Fi `/wireframe` (MCP),
  token styles + composants `/ds` (MCP).
- **Écrit** : boards Hi-Fi dans l'outil design via MCP. **Rien dans le repo.**

## Config

`providers.design` (`penpot` | `figma`), `design.target`, `design.fidelity`,
`design.interactive` (`static` par défaut | `prototype` pour un prototype cliquable).

## Comportement

Passe unique, **idempotent**. **Arrêt net** si le MCP ou le design system est absent.
Si le MCP ne sait pas créer les liens de prototype, dégradation **gracieuse** (transitions
documentées dans les descriptions).

## Agents utilisés

[`snap-drafter`](../agents.md#snap-drafter) (optionnel). Authoring MCP en contexte principal.

## Étape suivante

`/ticket` (si nouveaux écrans à découper) puis `/develop`.
