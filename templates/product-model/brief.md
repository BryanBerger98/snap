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

<!-- Frozen template — PR-FAQ / Working Backwards. Render in config.language;
     translate headings if "en". Keep the section order. Strip every guidance
     comment on render. Singleton: a second /define brief updates BRF-001 in place.
     stability: frozen = reviewed quarterly, not immutable.

     Snap visual grammar (markdown-first — readability first; the provider render
     layer adapts the markdown to the target's native blocks, NOT this file):
       - one compact meta line under the title (id · status);
       - a `> [!TIP]` TL;DR callout, 3 lines max;
       - a horizontal divider `---` directly under EVERY level-2 (`##`) heading;
       - tables for repeating data; numbered steps for sequences; nested lists ok;
       - evidence tag on uncertain claims: 🟢 evidence · 🟡 belief · 🔴 assumption;
       - a `> [!WARNING]` "À valider" box at the end listing the 🔴 items. -->

# {{title}} — PR-FAQ

`{{id}}` · {{status}}

> [!TIP]
> 🎯 **TL;DR** — la valeur, pour qui, pourquoi maintenant. 3 lignes max.

## 📣 Communiqué de presse

---

<!-- Written in the future, dated, as if the product just shipped. -->

- **Titre** — bénéfice client en une phrase
- **Sous-titre** — pour qui + quel gain
- **Problème** — ce qui fait mal aujourd'hui
- **Solution** — comment le produit le résout
- **Citation client** — le « must-have », fictif mais crédible

## ❓ FAQ

---

### Pourquoi maintenant ?
<!-- The timing / market window that makes this the moment. -->

### Pour qui ?
<!-- Target segment, and who comes first. → Personas PER-*. Never "everyone". -->

### Quelles alternatives aujourd'hui ?
<!-- What they use today + why it falls short. Tag evidence 🟢/🟡/🔴. -->

### Qu'est-ce qui nous rend uniques — et défendable ?
<!-- The differentiator. MUD: meaningful, unique, defensible (not copyable in 6 months). -->

### Comment on mesure le succès ?
<!-- North Star (leading, value-reflecting, actionable) + 2–3 input metrics.
     Anti-vanity check: could it rise while users are worse off? -->

### Qu'est-ce qu'on ne fait PAS ?
<!-- Non-goals: things that could reasonably be goals but we deliberately exclude,
     and the trade-off each protects. -->

### Quelle taille d'opportunité ?
<!-- How big (segment / TAM), enough to justify the work. -->

### Risques / inconnues majeurs ?

## 🎯 Hypothèse la plus risquée

---

<!-- The leap of faith: if this is wrong, the idea sinks. State it + how we'd know. -->

<!-- Brownfield only: add the two subsections below — `Vision implicite` (what the
     product really optimizes today, revealed by the audit) vs `Vision cible`. The
     delta between them is the real roadmap. Delete both for greenfield. -->

## 🔭 Vision implicite

---

## 🎯 Vision cible

---

## 🔗 Liens

---

- 👤 Personas — {{persona_links}}

> [!WARNING]
> **À valider (🔴)** — {{open_assumptions}}
