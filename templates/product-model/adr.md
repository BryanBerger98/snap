---
id: {{id}}
type: decision
title: "{{title}}"
status: proposée
stability: append-only
risk_type: feasibility
language: {{language}}
created: {{date}}
updated: {{date}}
links:
  parents: []
  children: []
  related: []
supersede: ""
---

<!-- Frozen template — product ADR, append-only. Render in config.language;
     translate headings if "en". Keep order. Strip every guidance comment on
     render. One decision = one short entry — a journal, not an essay.
       status    : proposée | actée | supersédée   (mirror the callout emoji)
       risk_type : value | usability | feasibility | viability | ethical
                   — which of the four+1 big risks this entry settles.
       supersede : ADR-* this one replaces (chaining)
       related   : the FEATURE(s) it decides about.

     Snap visual grammar (markdown-first): meta line; `> [!IMPORTANT]` status
     callout; a `---` divider under EVERY `##` heading; lists/tables as needed;
     evidence tags 🟢/🟡/🔴 where a claim is uncertain. -->

# {{title}}

`{{id}}` · risque: {{risk_type}} · ↳ {{feature_id}}

> [!IMPORTANT]
> 🟡 **Statut** : proposée · 📅 {{date}}
<!-- 🟡 proposée · 🟢 actée · ⚪ supersédée — keep the emoji in sync with status. -->

## 🧭 Contexte

---

<!-- The risk to settle and the forces at play: which feature, which of the 4+1 risks. -->

## ✅ Décision

---

<!-- What is settled. Active voice: "On …". If NOT yet settled, frame it as an
     assumption to test: "On croit … ; on saura que c'est vrai quand …". -->

## 🔀 Alternatives

---

<!-- Options considered + why each was rejected. -->

## 📉 Conséquences

---

<!-- Positive and negative results; follow-up work it creates. -->

## 🔗 Liens

---

- 🧩 Feature — {{feature_title}} ({{feature_id}})
