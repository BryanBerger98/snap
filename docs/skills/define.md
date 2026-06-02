# `/define`

> Cadre le produit comme une base de connaissances Markdown versionnée — Brief
> (PR-FAQ), Personas, Features (catalogue + PRD), Décisions (ADR) — plus une
> Roadmap et un Index régénérés.

## À quoi ça sert

Produit (ou fait évoluer) une base de connaissances produit **traçable** sous
`docsPath`. Suit un playbook greenfield dans l'ordre : Brief → Personas → catalogue
de Features (stubs) → Features `specified` du *Now* (avec PRD, user flow, critères
d'acceptation) → Décisions (ADR). Un **lint déterministe** tourne après chaque écriture
et les vues `INDEX.md` / `ROADMAP.md` sont régénérées.

## Invocation

```
/define                      # playbook greenfield complet
/define brief|personas|features|decisions|roadmap   # une partie seulement
```

L'argument optionnel cible un type d'entité (`decisions` = alias `adr`). Sans argument,
joue le playbook complet.

## Entrées / Sorties

- **Lit** : `snap.config.json` (`language`, `docsPath`, `providers.doc`), un digest d'état
  (frontmatter seul) injecté automatiquement, les templates `templates/<type>.md`.
- **Écrit** : fichiers d'entité `<docsPath>/<dir>/<ID>-<slug>.md`, `INDEX.md`, `ROADMAP.md`.
  En provider distant (Notion / AFFiNE) : pages/records via MCP + scratch `.snap/tmp/state.json`.

## Config

`language`, `docsPath`, `providers.doc` (`repository` | `notion` | `affine`),
`define.order`, `define.validation`, et le bloc `remote.*` du provider distant choisi.

## Comportement

Pas de mode gate/autonomous. Le **lint est bloquant** : une ERROR force la correction
avant de finir (pas de cap d'itération — on corrige dans la passe).

En provider distant, un **round-trip** garantit la cohérence : pré-chargement de l'état
([`snap-loader`](../agents.md#snap-loader)), fan-out 1 agent par entité
([`snap-writer`](../agents.md#snap-writer)), passe 2 de liens natifs Notion
([`snap-linker`](../agents.md#snap-linker)), puis re-lecture de clôture.

## Agents utilisés

[`snap-drafter`](../agents.md#snap-drafter) (corps longs de PRD), et en distant
[`snap-loader`](../agents.md#snap-loader), [`snap-writer`](../agents.md#snap-writer),
[`snap-linker`](../agents.md#snap-linker) (Notion).

## Étape suivante

`/ticket`.
