---
id: {{id}}
type: bug
title: "{{title}}"
status: open
stability: living
language: {{language}}
created: {{date}}
updated: {{date}}
links:
  parents: []
  children: []
  related: []
severity: ""
priority: ""
board_url: ""
owner: ""
---

<!-- Frozen template (D-021). A BUG is a reported defect. parents links it to the
     affected story STORY-* (or epic EPIC-*, or feature FEAT-* when no story fits).
     Render in config.language; translate headings if "en"; strip every guidance
     comment.

     Frontmatter cheatsheet:
       status   : open | doing | resolved | closed
       severity : blocker | critical | major | minor | trivial   (or "")
       priority : P0 | P1 | P2 | P3  (or "")
       parents  : affected STORY-* / EPIC-* / FEAT-* -->

# {{title}}

## Description
<!-- What is wrong, in one or two lines. -->

## Reproduction
<!-- Numbered steps to reproduce. Include environment if relevant. -->

## Comportement attendu vs observé
<!-- Expected: … / Observed: … -->

## Sévérité & impact
<!-- Who/what is affected, how badly (justifies the severity field). -->

## Piste / cause suspectée
<!-- Optional first hypothesis. Keep the heading even if empty. -->
