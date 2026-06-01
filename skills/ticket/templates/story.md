---
id: {{id}}
type: story
title: "{{title}}"
status: backlog
stability: living
language: {{language}}
created: {{date}}
updated: {{date}}
links:
  parents: []
  children: []
  related: []
estimate: ""
priority: ""
board_url: ""
owner: ""
---

<!-- Frozen template (D-021). A STORY is the core actionable unit: a vertical,
     user-facing slice with testable acceptance criteria. parents = [EPIC-xxx];
     related may point to the persona (PER-*) and/or source feature (FEAT-*) it
     serves. Acceptance criteria flow from the FEATURE's. Render in config.language;
     translate headings if "en"; strip every guidance comment.

     Frontmatter cheatsheet:
       status   : backlog | todo | doing | review | done
       estimate : story points (e.g. "3") or "" if not estimated
       priority : P0 | P1 | P2 | P3  (or "")
       parents  : the epic EPIC-* this story belongs to
       children : technical tasks TASK-* and bugs BUG-* under it
       related  : persona PER-* and/or source feature FEAT-* -->

# {{title}}

## User story
<!-- "En tant que <persona>, je veux <capacité>, afin de <bénéfice>." -->

## Contexte
<!-- Why now; the slice of the feature this story covers. -->

## Critères d'acceptation
<!-- Testable conditions of done. Given/When/Then preferred — these drive /qa and /tests. -->

## Notes techniques
<!-- Constraints, dependencies, design pointers. Optional but keep the heading. -->

## Définition of Done
<!-- The shared DoD gate (code + review + tests + qa) for this story. -->
