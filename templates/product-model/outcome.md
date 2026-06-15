---
id: {{id}}
type: outcome
title: "{{title}}"
outcome_type: Supporting
metric: ""
baseline: ""
target: ""
horizon: Now
status: proposé
stability: living
language: {{language}}
created: {{date}}
updated: {{date}}
links:
  parents: [BRF-001]
  children: []
  related: []
---

<!-- Deferred entity (§7) — activate when you start talking metrics. Render in
     config.language; translate headings if "en". Strip every guidance comment.
       outcome_type : North Star | Supporting | Guardrail
       status       : proposé | actif | atteint | abandonné
       metric/baseline/target : how it's measured, current value, goal.
       related      : the FEATURE(s) that move this outcome.
     Guardrail: 1 North Star, ≤ 4 supporting/guardrail. 10 metrics = 0 metric.

     Snap visual grammar (markdown-first): meta line; `> [!TIP]` framing callout;
     `---` divider under EVERY `##`; table for the measure; evidence tags 🟢/🟡/🔴
     where the baseline/target is a guess. -->

# {{title}}

`{{id}}` · {{outcome_type}} · {{status}} · ↳ BRF-001

> [!TIP]
> 📈 **Outcome** — formulé en résultat (un changement de comportement), pas en feature.

## 📏 Mesure

---

| Élément | Valeur |
|---|---|
| 🎚 Métrique | {{metric}} |
| 🅱 Baseline | {{baseline}} |
| 🎯 Cible | {{target}} |

## 🔗 Liens

---

- 📄 Brief — {{brief_title}} (BRF-001)
- 🧩 Features — {{feature_ids}}
