# ID scheme & file layout

Single source of truth for how `/define` maps an argument to an entity, a
directory, an ID prefix, and a template. Entity model: D-019 (Markdown rendering
of `schema-documentation-produit.md`). The `id` is the universal join key (the
schema's `key`) — it survives any future export to Notion or another provider.

## v1 entities

| Argument (sing./plur.) | `type` | Directory | ID prefix | Template | Cardinality | Stability |
| --- | --- | --- | --- | --- | --- | --- |
| `brief` | `brief` | `01-brief/` | `BRF-` | `brief.md` | singleton (`BRF-001`) | frozen |
| `persona` / `personas` | `persona` | `02-personas/` | `PER-` | `persona.md` | multiple | living |
| `feature` / `features` | `feature` | `03-features/<domain>/` | `FEAT-` | `feature.md` | multiple | living |
| `decision` / `decisions` / `adr` | `decision` | `04-decisions/` | `ADR-` | `adr.md` | multiple | append-only |
| `roadmap` | — (generated view) | `docsPath/ROADMAP.md` | — | — | singleton, **generated** | — |

The tree is **numbered for reading order** (`01-`…`04-`); features nest one level
deeper under a per-`domain` subfolder (next section). `ROADMAP.md` and `README.md`
are **generated** by `build-index.mjs` (never authored by hand): the roadmap is a
filtered view of Features by `horizon`, and `README.md` is the generated front-door
(it replaces the former `INDEX.md` — D-048), neither is an entity.

## Deferred entities (added JIT — schema §7)

`OUTCOME` (`OUT-`, metrics — when you talk metrics) · `OPPORTUNITY` (`OPP-`, OST —
≥ 3 user interviews) · `RELEASE` (`REL-`, changelog) · `GLOSSARY` (`GLO-`). Not in
v1; add when the trigger fires. **Templates already exist** (dormant until triggered):
`templates/product-model/{outcome,opportunity,release,glossary}.md`.

## File naming

```
<docsPath>/<dir>/<ID>-<slug>.md
e.g. docs/product/03-features/orders/FEAT-001-order-tracking.md
```

- `<ID>` = prefix + zero-padded 3-digit number (`FEAT-001`, `FEAT-002`, …).
- `<slug>` = kebab-case of the title: lowercase ASCII, spaces → `-`, strip
  punctuation, collapse repeats. Keep it short (≤ 6 words).

## Numbering

- Allocate the **next free** number per prefix by scanning existing IDs (filenames
  + frontmatter `id`). Never reuse a retired number.
- **Singleton** `BRF-`: reuse `001` — a second `/define brief` updates `BRF-001`.

## Domains & grouping (not epics)

- Features are grouped by **functional domain** — a `domain` slug on each feature
  (`auth`, `orgs`, `rgpd`, `settings`, `admin`, …), **not** by epic. Epics are a
  project-management concept and live on the ticket board, never in product doc.
- A domain is **not an authored entity** — no `DOM-` file, no template. It is a
  structuring container: on the repo side each feature lives in a per-domain
  subfolder `03-features/<slug>/` and the `domain` field **must equal** that
  subfolder slug; on the Notion side the render layer maps the slug to a `domain`
  select option (see `persist-notion.md` › render layer).
- **Nesting rule (lint-enforced).** `fm.domain` ↔ the `03-features/<slug>/` parent
  folder are two views of one fact and must agree. `lint-docs.mjs` flags any feature
  whose `domain` ≠ its containing subfolder. One distinct slug ⇒ exactly one subfolder;
  `build-index.mjs` walks `03-features/` **recursively** to collect them.
- Domain slug → display label + emoji is resolved from a small table in the render
  layer (extensible), e.g. `auth → 🔐 Authentification`.

## Stability

- An `id` is **immutable** once written; renaming the title changes the `<slug>`
  (and may rename the file), never the `id`.
- Links between entities always reference the stable `id`, never the file path.
