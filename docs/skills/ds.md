# `/ds`

> Construit et maintient le design system directement dans l'outil design (Penpot
> ou Figma) via MCP — styles de tokens (couleur, typo, espacement, radius, effets)
> en tiers primitive → semantic → component, plus composants avec variants/états
> bindés aux tokens. L'outil est la source de vérité ; le code est une source
> d'`import` et une cible d'`export`.

## À quoi ça sert

Crée les styles de tokens (tier primitive → semantic → component) et les composants
(variants + états, bindés aux token styles) dans Penpot ou Figma via MCP. Sait
**importer** un DS code existant (DTCG / CSS custom properties / Tailwind v4 `@theme`)
pour amorcer l'outil, et **exporter** depuis l'outil vers `ds.exportPath`. Tout l'authoring
est idempotent par nom.

## Invocation

```
/ds                          # sync complet (tokens + composants, propose export)
/ds tokens | components | import | export
/ds <groupe de tokens> | <composant>
```

## Entrées / Sorties

- **Lit** : `snap.config.json` (`providers.design`, `ds.*`), les Features `specified`
  (inventaire de composants), les boards wireframe existants (MCP), un DS code existant
  (pour `import`).
- **Écrit** : token styles + librairie de composants dans l'outil (MCP). Sur `export` :
  `tokens.json` (DTCG), `tokens.css`, `tailwind.tokens.json`, `components.md` dans
  `ds.exportPath` de l'app (via un codec déterministe sans dépendances).

## Config

`providers.design` (`penpot` | `figma`), `ds.target`, `ds.tokenFormat` (`dtcg`),
`ds.exportPath`.

## Comportement

Passe unique, **idempotent**. **Arrêt net** si le MCP est injoignable.

## Agents utilisés

[`snap-drafter`](../agents.md#snap-drafter) (optionnel, gros inventaires).
L'authoring MCP reste dans le contexte principal.

## Étape suivante

`/design`.
