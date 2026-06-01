# Ticket ID scheme & file layout

Single source of truth for how `/ticket` maps an argument to a delivery entity, a
directory, an ID prefix, and a template. Delivery tickets live in their own root
(`ticketsPath`, default `docs/delivery/`), separate from the product docs
(`docsPath`) — they have a distinct lifecycle and may later sync to a project
manager (GitHub Projects / Jira). The `id` is the stable join key (it survives any
future board export).

## v1 entities

| Argument (sing./plur.) | `type` | Directory | ID prefix | Template | Cardinality | Stability |
| --- | --- | --- | --- | --- | --- | --- |
| `epic` / `epics` | `epic` | `epics/` | `EPIC-` | `epic.md` | multiple | living |
| `story` / `stories` | `story` | `stories/` | `STORY-` | `story.md` | multiple | living |
| `task` / `tasks` | `task` | `tasks/` | `TASK-` | `task.md` | multiple | living |
| `bug` / `bugs` | `bug` | `bugs/` | `BUG-` | `bug.md` | multiple | living |
| `board` / `backlog` | — (generated view) | `ticketsPath/{BOARD,BACKLOG}.md` | — | — | singleton, **generated** | — |

`BACKLOG.md` (hierarchy) and `BOARD.md` (kanban by status) are **generated** by
`build-board.mjs` — never authored by hand.

## File naming

```
<ticketsPath>/<dir>/<ID>-<slug>.md
e.g. docs/delivery/stories/STORY-001-join-shared-session.md
```

- `<ID>` = prefix + zero-padded 3-digit number (`STORY-001`, `STORY-002`, …).
- `<slug>` = kebab-case of the title: lowercase ASCII, spaces → `-`, strip
  punctuation, collapse repeats. Keep it short (≤ 6 words).

## Numbering

- Allocate the **next free** number per prefix by scanning existing IDs (filenames
  + frontmatter `id`) under `ticketsPath`. Never reuse a retired number.
- Numbering is **per prefix** and independent across types (EPIC-, STORY-, TASK-,
  BUG- each have their own counter).

## Hierarchy (lives in frontmatter `links`, not in folders)

```
FEATURE (FEAT-*, in docsPath)        ← source product spec
  └─ EPIC (EPIC-*)    parents: [FEAT-*]
       └─ STORY (STORY-*)   parents: [EPIC-*]   related: [PER-*, FEAT-*]
            ├─ TASK (TASK-*)   parents: [STORY-*]  (or [EPIC-*] for cross-cutting)
            └─ BUG  (BUG-*)    parents: [STORY-*]  (or [EPIC-*] / [FEAT-*])
```

- One **`specified` FEATURE → one EPIC** by default (1:1 bridge). An epic may group
  several features (multiple `parents`) when that fits.
- All tickets stay **flat** inside their `<type>/` folder; the tree above is encoded
  in `links.parents`/`links.children`, kept in sync on write (D-014).
- Cross-root links are allowed and expected: an EPIC's `parents` point into
  `docsPath` (FEAT-*). The lint resolves both roots.

## Stability

- An `id` is **immutable** once written; renaming the title changes the `<slug>`
  (and may rename the file), never the `id`.
- Links always reference the stable `id`, never the file path.
