---
id: {{id}}
type: release
title: "{{title}}"
status: publiée
stability: append-only
language: {{language}}
created: {{date}}
updated: {{date}}
links:
  parents: []
  children: []
  related: []
release_type: [feature]
---

<!-- Deferred entity (§7 — Changelog). Activate when you ship regularly. Append-only:
     one entry per release, never rewritten. Render in config.language; translate
     headings if "en". Strip every guidance comment.
       title        : version string, e.g. "v0.3.0".
       release_type : any of feature | fix | breaking (multi).
       related      : the FEATURE(s) shipped in this release.

     Snap visual grammar (markdown-first): meta line; `> [!IMPORTANT]` release
     banner; `---` divider under EVERY `##`; flat bullets per change type. -->

# {{title}}

`{{id}}` · {{release_type}} · 📅 {{date}}

> [!IMPORTANT]
> 🚀 **Release {{title}}** — publiée le {{date}}.

## ✨ Nouveautés

---

<!-- feature-type changes. -->

- …

## 🐛 Corrections

---

<!-- fix-type changes. -->

- …

## 💥 Ruptures

---

<!-- breaking changes — migration notes. -->

- …

## 🔗 Liens

---

- 🧩 Features — {{feature_ids}}
