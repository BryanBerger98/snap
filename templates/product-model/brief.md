---
id: {{id}}
type: brief
title: "{{title}}"
status: draft
stability: frozen
language: {{language}}
created: {{date}}
updated: {{date}}
links:
  parents: []
  children: []
  related: []
---

<!-- Frozen template — PR-FAQ / Working Backwards (D-019, schema L0). Render in
     config.language; translate headings if "en". Keep the order. Strip every
     guidance comment. Singleton: a second /define brief updates BRF-001 in place.
     stability: frozen = reviewed quarterly, not immutable. -->

# {{title}} — PR-FAQ

## TL;DR
<!-- 3 lines max. The deep-module interface: value, for whom, why now. -->

## Communiqué de presse
<!-- Written in the future, dated, as if the product just shipped. -->
- **Titre** — bénéfice client en une phrase
- **Sous-titre** — pour qui + quel gain
- **Problème** — ce qui fait mal aujourd'hui
- **Solution** — comment le produit le résout
- **Citation client** — le « must-have », fictif mais crédible

## FAQ
<!-- Answer each; link IDs where relevant. -->
- **Pourquoi maintenant ?**
- **Pour qui ?** (→ Personas `PER-*`)
- **Comment on mesure le succès ?** (North Star ; → Outcomes when activated)
- **Qu'est-ce qu'on ne fait PAS ?** (hors-périmètre)
- **Risques / inconnues majeurs ?**

<!-- Brownfield only: add two subsections — `Vision implicite` (what the product
     really optimizes today, revealed by the audit) vs `Vision cible`. The delta
     between them is the real roadmap. -->
