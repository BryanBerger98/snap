# ID scheme & file layout

Single source of truth for how `/define` maps an argument to an entity, a
directory, an ID prefix, and a template. Entity model: D-019 (Markdown rendering
of `schema-documentation-produit.md`). The `id` is the universal join key (the
schema's `key`) — it survives any future export to Notion/AFFiNE.

## v1 entities

| Argument (sing./plur.) | `type` | Directory | ID prefix | Template | Cardinality | Stability |
| --- | --- | --- | --- | --- | --- | --- |
| `brief` | `brief` | `brief/` | `BRF-` | `brief.md` | singleton (`BRF-001`) | frozen |
| `persona` / `personas` | `persona` | `personas/` | `PER-` | `persona.md` | multiple | living |
| `feature` / `features` | `feature` | `features/` | `FEAT-` | `feature.md` | multiple | living |
| `decision` / `decisions` / `adr` | `decision` | `decisions/` | `ADR-` | `adr.md` | multiple | append-only |
| `roadmap` | — (generated view) | `docsPath/ROADMAP.md` | — | — | singleton, **generated** | — |

`ROADMAP.md` and `INDEX.md` are **generated** by `build-index.mjs` (never authored
by hand): the roadmap is a filtered view of Features by `horizon`, not an entity.

## Deferred entities (added JIT — schema §7)

`OUTCOME` (`OUT-`, metrics — when you talk metrics) · `OPPORTUNITY` (`OPP-`, OST —
≥ 3 user interviews) · `RELEASE` (`REL-`, changelog) · `GLOSSARY` (`GLO-`). Not in
v1; add when the trigger fires.

## File naming

```
<docsPath>/<dir>/<ID>-<slug>.md
e.g. docs/product/features/FEAT-001-order-tracking.md
```

- `<ID>` = prefix + zero-padded 3-digit number (`FEAT-001`, `FEAT-002`, …).
- `<slug>` = kebab-case of the title: lowercase ASCII, spaces → `-`, strip
  punctuation, collapse repeats. Keep it short (≤ 6 words).

## Numbering

- Allocate the **next free** number per prefix by scanning existing IDs (filenames
  + frontmatter `id`). Never reuse a retired number.
- **Singleton** `BRF-`: reuse `001` — a second `/define brief` updates `BRF-001`.

## Epics & hierarchy

- A FEATURE with `type: epic` is a parent; child features set `links.parents:
  [EPIC_OR_FEAT_ID]`. Hierarchy lives in frontmatter relations, **not** in folders —
  all features stay flat under `features/`. (Epics keep the `FEAT-` prefix; the
  `type` field distinguishes them.)

## Stability

- An `id` is **immutable** once written; renaming the title changes the `<slug>`
  (and may rename the file), never the `id`.
- Links between entities always reference the stable `id`, never the file path.
