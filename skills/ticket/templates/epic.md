---
id: {{id}}
type: epic
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
board_url: ""
owner: ""
---

<!-- Frozen template (D-021). An EPIC is the delivery container that mirrors one
     `specified` FEATURE: parents = [FEAT-xxx], children = its STORY-* . It is a
     rollup, not a spec — keep the body light; the detail lives in the stories.
     Render in config.language; translate headings if "en"; strip every guidance
     comment.

     Frontmatter cheatsheet:
       status   : todo | doing | done
       parents  : the source feature(s) FEAT-* (usually exactly one)
       children : the stories STORY-* it breaks down into (kept in sync on write)
       board_url: URL of the GitHub/Jira Epic once pushed (later skills) -->

# {{title}}

## TL;DR
<!-- 2-3 lines: what shipping this epic delivers to the user. -->

## Objectif de livraison
<!-- The feature outcome this epic moves (restate the FEATURE value_hypothesis). -->

## Périmètre — stories incluses
<!-- Bullet list of the child stories (STORY-*). Mirrors links.children. -->

## Critères de complétion
<!-- Epic is `done` when… (the acceptance bar at epic level). -->
