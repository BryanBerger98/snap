---
id: {{id}}
type: task
title: "{{title}}"
status: todo
stability: living
language: {{language}}
created: {{date}}
updated: {{date}}
links:
  parents: []
  children: []
  related: []
estimate: ""
kind: ""
board_url: ""
owner: ""
---

<!-- Frozen template (D-021). A TASK is a technical sub-unit of a story (or, for
     cross-cutting work, of an epic). It is implementation-oriented, not
     user-facing. parents = [STORY-xxx] (or [EPIC-xxx]). Render in config.language;
     translate headings if "en"; strip every guidance comment.

     Frontmatter cheatsheet:
       status   : todo | doing | done
       kind     : dev | infra | test | chore | spike   (or "")
       estimate : effort hint (e.g. "2h") or ""
       parents  : the parent story STORY-* (or epic EPIC-*) -->

# {{title}}

## Description
<!-- The technical work, one paragraph. -->

## Étapes
<!-- Ordered steps / sub-checklist. -->

## Définition of Done
<!-- Concrete, verifiable: what must be true for this task to be `done`. -->
