---
id: {{id}}
type: opportunity
title: "{{title}}"
size: M
status: à explorer
stability: living
language: {{language}}
created: {{date}}
updated: {{date}}
links:
  parents: []
  children: []
  related: []
evidence: ""
---

<!-- Deferred entity (§7 — Opportunity Solution Tree). Activate at ≥ 3 user
     interviews. Render in config.language; translate headings if "en". Strip every
     guidance comment.
       title    : phrased as a CUSTOMER NEED, never a solution.
       size     : S | M | L  (impact × confidence)
       status   : à explorer | en test | retenue | écartée
       parents  : parent opportunity (OPP-*) for the tree; and/or the OUTCOME it frames.
       related  : persona(s) PER-*.
       evidence : where the insight comes from (verbatim, ticket URL…).
     Guardrail: prioritise OPPORTUNITIES, not solutions. A documented discarded
     opportunity is gold — it stops you revisiting it.

     Snap visual grammar (markdown-first): meta line; `> [!TIP]` framing callout;
     `---` divider under EVERY `##`; evidence tags 🟢 evidence / 🟡 belief /
     🔴 assumption; a `> [!WARNING]` "À valider" box listing the 🔴. -->

# {{title}}

`{{id}}` · taille: {{size}} · {{status}} · ↳ {{persona_id}}

> [!TIP]
> 🧭 **Opportunité** — un besoin client à résoudre, pas une solution.

## 🔍 Preuve / insight

---

<!-- Verbatim, ticket, data point. Where this came from. Tag evidence 🟢/🟡/🔴. -->

## 🌱 Solutions envisagées

---

<!-- Candidate solutions (→ become Features once retained). -->

- …

## 🔗 Liens

---

- 👤 Persona — {{persona_title}} ({{persona_id}})
- 📈 Outcome — {{outcome_title}} ({{outcome_id}})

> [!WARNING]
> **À valider (🔴)** — {{open_assumptions}}
