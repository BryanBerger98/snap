---
id: {{id}}
type: feature
title: "{{title}}"
domain: {{domain}}
source: discovered
depth: stub
horizon: Now
status: idea
shipped_at: ""
stability: living
language: {{language}}
created: {{date}}
updated: {{date}}
links:
  parents: []
  children: []
  related: []
owner: ""
value_hypothesis: ""
---

<!-- Frozen template (the core entity). A FEATURE is a catalogue row by default
     (depth: stub) = title + persona (links.related) + value_hypothesis, nothing
     else. Fill the PRD body below ONLY when depth: specified (reserved for `Now`
     items). Render in config.language; translate headings if "en"; strip every
     guidance comment on render.

     Frontmatter cheatsheet:
       type       : feature | enhancement   (no epic — grouping is `domain`)
       domain     : functional-area slug — auth | orgs | rgpd | settings | admin | …
                    MUST equal the `03-features/<slug>/` subfolder this file lives in.
       source     : discovered | inventoried        (greenfield vs brownfield audit)
       depth      : stub | specified                (specified ⇒ keep the PRD body)
       horizon    : Now | Next | Later | Done        → feeds the generated ROADMAP
       status     : idea | discovery | ready | building | shipped | deprecated
       shipped_at : ISO date the feature shipped — optional, never required, not
                    auto-filled. Leave "" until you know it. Sorts the ROADMAP Done.
       parents    : BRF-001 ; related: persona(s) PER-* ; owner: person
       value_hypothesis : "On croit <X>, mesuré par <Y>."

     Snap visual grammar (markdown-first): meta line; `> [!TIP]` value-hypothesis
     callout; `---` divider under EVERY `##`; numbered user flow with nested
     alt/error branches; tables for acceptance criteria & NFRs; evidence tags
     🟢/🟡/🔴; a `> [!WARNING]` "À valider" box listing the 🔴. -->

# {{title}}

`{{id}}` · {{horizon}} · {{status}} · domaine: {{domain}} · ↳ {{persona_id}}

> [!TIP]
> 💡 **Hypothèse de valeur** — {{value_hypothesis}}

<!-- ===== Stub stops here. Everything below = PRD body (depth: specified only).
     Delete this whole block for a stub. ===== -->

## 🎯 Problème & contexte

---

<!-- The job this solves + today's workaround. 3 lines, the deep-module interface. -->

## 📊 Objectif & métrique

---

<!-- The OUTCOME it moves (a behaviour change), not an output. Restate the hypothesis. -->

## 📦 Périmètre

---

### ✅ Inclus
<!-- The thinnest valuable slice. -->

- …

### 🚫 Exclu
<!-- Explicit exclusions — as important as what's in. Stops scope creep mid-sprint. -->

- …

## 🔀 User flow

---

1. …
2. …
   - alternative / erreur : …

## 👤 User stories

---

<!-- "En tant que <persona>, je veux <capacité>, afin de <bénéfice>." INVEST. -->

- En tant que …, je veux …, afin de …

## ☑️ Critères d'acceptation

---

<!-- Given/When/Then. Happy path AND at least one sad path (erreur / pas de données). -->

| # | Étant donné | Quand | Alors |
|---|---|---|---|
| 1 | … | … | … |

## 🧰 Exigences non-fonctionnelles

---

<!-- The NFRs teams forget. Fill the relevant rows; mark a row `N/A — raison`. -->

| Dimension | Cible |
|---|---|
| Performance (latence) | … |
| Sécurité / données (RGPD) | … |
| Accessibilité (a11y) | … |
| Observabilité (logs / alertes) | … |
| Compatibilité | … |

## 🔌 Dépendances & instrumentation

---

- **Dépendances** — features / services / tiers requis.
- **Événements analytiques** — ce qu'il faut tracer pour mesurer l'objectif.

## 🚀 Déploiement

---

- **Mise en ligne** — flag / segment / kill-switch ?
- **Migration** — données ou réglages existants à gérer ?

## ⚠️ Risques & questions ouvertes

---

<!-- ===== End PRD body ===== -->

## 🔗 Liens

---

- 👤 Persona — {{persona_title}} ({{persona_id}})
- 📄 Brief — {{brief_title}} (BRF-001)

> [!WARNING]
> **À valider (🔴)** — {{open_assumptions}}
