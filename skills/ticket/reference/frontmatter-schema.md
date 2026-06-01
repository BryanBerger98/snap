# Ticket frontmatter schema

Every ticket file starts with a YAML frontmatter block — the machine-readable
contract that `build-board.mjs` parses and that later skills (`/develop`, `/qa`,
`/tests`) traverse for traceability. `id` is the stable join key; links bridge
into the product docs (`docsPath`) and across tickets.

## Common keys (all ticket entities)

| Key | Required | Value |
| --- | --- | --- |
| `id` | yes | stable ID, prefix per `id-scheme.md`; immutable |
| `type` | yes | `epic` \| `story` \| `task` \| `bug` |
| `title` | yes | quoted human-readable string |
| `status` | yes | per-entity workflow state (see below) |
| `stability` | yes | always `living` for tickets |
| `language` | yes | `fr` or `en`, from `snap.config.json` |
| `created` | yes | ISO `YYYY-MM-DD`, set once |
| `updated` | yes | ISO `YYYY-MM-DD`, bumped on edit |
| `links.parents` | yes (may be `[]`) | upward links — see hierarchy |
| `links.children` | yes (may be `[]`) | downward links |
| `links.related` | yes (may be `[]`) | cross links (persona, feature) |
| `board_url` | yes (may be `""`) | URL on the PM board once pushed |
| `owner` | yes (may be `""`) | assignee |

## Per-entity status values

| Entity | `status` enum | `stability` |
| --- | --- | --- |
| `epic` | `todo` \| `doing` \| `done` | `living` |
| `story` | `backlog` \| `todo` \| `doing` \| `review` \| `done` | `living` |
| `task` | `todo` \| `doing` \| `done` | `living` |
| `bug` | `open` \| `doing` \| `resolved` \| `closed` | `living` |

## Per-entity extra keys

| Entity | Key | Value |
| --- | --- | --- |
| `story` | `estimate` | story points (e.g. `"3"`) or `""` |
| `story` | `priority` | `P0` \| `P1` \| `P2` \| `P3` \| `""` |
| `task` | `estimate` | effort hint (e.g. `"2h"`) or `""` |
| `task` | `kind` | `dev` \| `infra` \| `test` \| `chore` \| `spike` \| `""` |
| `bug` | `severity` | `blocker` \| `critical` \| `major` \| `minor` \| `trivial` \| `""` |
| `bug` | `priority` | `P0` \| `P1` \| `P2` \| `P3` \| `""` |

## Link conventions

- **Epic**: `parents` = the source feature(s) `FEAT-*` (1:1 by default);
  `children` = its stories `STORY-*`.
- **Story**: `parents` = `[EPIC-*]`; `related` = persona `PER-*` and/or source
  feature `FEAT-*`; `children` = its tasks/bugs.
- **Task**: `parents` = `[STORY-*]` (or `[EPIC-*]` for cross-cutting work).
- **Bug**: `parents` = the affected `STORY-*` / `EPIC-*` / `FEAT-*`.
- Links are **bidirectional by convention**: if `A.children` includes `B`, then
  `B.parents` should include `A`. The board does not auto-repair; the skill keeps
  both ends in sync on write.
- Cross-root links into `docsPath` (FEAT-*/PER-*) are valid; the lint loads both
  roots before checking integrity.
- Arrays may be inline (`[A, B]`) or block lists; the parser handles both. Prefer
  inline to match the templates.
