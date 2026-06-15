---
id: {{id}}
type: persona
title: "{{title}}"
persona_type: proto
niveau_preuve: hypothèse
status: actif
stability: living
language: {{language}}
created: {{date}}
updated: {{date}}
links:
  parents: []
  children: []
  related: []
---

<!-- Frozen template. Render in config.language; translate headings if "en". Keep
     the order. Strip every guidance comment on render.
     persona_type: proto (hypothesis) | validé (interviews/data).
     niveau_preuve: hypothèse | entretiens | data. links.parents usually = BRF-001.
     Guardrail: 1–3 personas in 0→1, kept `proto`. No fictional bio (age, photo)
     until validé — that's a novel, not data.

     Snap visual grammar (markdown-first): compact meta line under the title; a
     `> [!TIP]` TL;DR callout; a `---` divider directly under EVERY `##` heading;
     tables for jobs/pains (evidence as a column); evidence tags 🟢 evidence /
     🟡 belief / 🔴 assumption; a `> [!WARNING]` "À valider" box listing the 🔴. -->

# 👤 {{title}}

`{{id}}` · {{persona_type}} · 🟡 {{niveau_preuve}} · ↳ BRF-001

> [!TIP]
> 🎯 **JTBD (Jobs To Be Done)** — {{jtbd_one_liner}}

## 🎯 Jobs

---

<!-- The three job types are DISTINCT (Ulwick), not facets of one. Fill all three. -->

| Type | Job | Preuve |
|---|---|---|
| Fonctionnel | … | 🟢 |
| Émotionnel | … | 🟡 |
| Social | … | 🟡 |

## 😣 Douleurs

---

| Douleur | Intensité | Preuve |
|---|---|---|
| … | Élevée | 🟢 |

## 🎁 Gains attendus

---

<!-- Desired outcomes in the form: minimiser|maximiser + métrique + objet. -->

- …

## 🛠️ Contournement actuel

---

<!-- How they solve it today — reveals the real bar the product must beat. -->

## ⚡ Déclencheur & contexte

---

- **Quand** — …
- **Où** — … (support, contraintes)
- **Fréquence** — …

## 🔄 Forces du switch

---

<!-- Why they would / wouldn't switch (JTBD forces). Tag evidence. -->

- **Push** — … 🟢
- **Pull** — … 🟡
- **Anxiété** — … 🔴
- **Habitude** — … 🟢

## 🎬 Scénarios clés

---

1. …
2. …

## 🔗 Liens

---

- 📄 Brief — {{brief_title}} (BRF-001)

> [!WARNING]
> **À valider (🔴)** — {{open_assumptions}}
