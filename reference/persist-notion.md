# Snap — Notion persistence recipe

MCP recipes for the four remote agents when `providers.doc = notion`.
Read `notion-schema.md` for the full column contract (types, enums, link semantics).

---

## Auth

The Notion token lives in `.env` and is held by the MCP server. This recipe never
touches it. Database ids and page ids are non-secret — they live in
`snap.config.json → remote.notion` and are safe to log/return in manifests.

```json
// snap.config.json (read-only for agents)
{ "remote": { "notion": {
    "parentPageId": "<page-id>",
    "briefPageId":  "<page-id>",
    "roadmapViewId":"<view-id>",
    "databases": { "personas": "<db-id>", "features": "<db-id>", "decisions": "<db-id>" }
} } }
```

---

## 1. Provisioning (snap-provisioner, /snap:init)

Goal: create the three databases + Brief page + Roadmap view under the user's chosen
parent page, idempotently. Run only once; re-running must not duplicate.

### Step 1 — search before create (idempotence)

```
notion-search
  query: "Personas"          // repeat for "Features", "Decisions", "Brief"
  parentId: <parentPageId>
```

If a result matches the expected title and type (database / page), reuse its id.
Only call `notion-create-database` / `notion-create-pages` for what is missing.

### Step 2 — create the Brief page first (singleton, front door)

The Brief is the **root** of the Notion backend: a **page** (not a DB row) the three
databases hang under. Create it **before** the databases so they can be parented to it
(`parentPageId == briefPageId` for the DBs — the whole backend then has one front door).
Use `notion-create-pages` with `parentId = <parentPageId>` (the workspace/page the user
picked); **capture the returned page-id as `briefPageId`**. The page content must begin
with a fenced YAML block (see `notion-schema.md §The Brief page`):

```
notion-create-pages
  parentId: <parentPageId>          // the user-picked workspace/page
  title: "Brief"
  content: |
    ```yaml
    id: BRF-001
    type: brief
    ...
    ```
    # <title>
    …PR-FAQ body…
```

### Step 3 — create the databases (parented to the Brief)

Call `notion-create-database` once per missing DB, each **parented to the Brief page**
(`parentId = <briefPageId>`, not the workspace). Pass the full property schema so select
options exist from the start — **Notion rejects a write whose select value isn't in the
property's option list**, so enumerate every enum option (and every known `domain` slug)
at create; a new option needs `notion-update-data-source` **before** the first row that
uses it (the later escape hatch, but it adds latency).
Example for **Features**:

```jsonc
// notion-create-database — Features (parented to the Brief)
{
  "parentId": "<briefPageId>",
  "title": "Features",
  "properties": {
    "Name":        { "type": "title" },
    "snap_id":     { "type": "rich_text" },
    "type":        { "type": "select", "options": [{ "name": "feature" }, { "name": "enhancement" }] },
    "status":      { "type": "select", "options": [
                     { "name": "idea" }, { "name": "discovery" }, { "name": "ready" },
                     { "name": "building" }, { "name": "shipped" }, { "name": "deprecated" }] },
    "stability":   { "type": "select", "options": [
                     { "name": "frozen" }, { "name": "living" }, { "name": "append-only" }] },
    "language":    { "type": "select", "options": [{ "name": "fr" }, { "name": "en" }] },
    "created":     { "type": "date" },
    "updated":     { "type": "date" },
    "parents":     { "type": "rich_text" },
    "children":    { "type": "rich_text" },
    "related":     { "type": "rich_text" },
    "rel_parents": { "type": "relation", "database_id": "<features-db-id>" },
    "rel_related": { "type": "relation", "database_id": "<features-db-id>" },
    // per-type extras
    "domain":          { "type": "select", "options": [
                         { "name": "auth" }, { "name": "orgs" }, { "name": "rgpd" },
                         { "name": "settings" }, { "name": "admin" }, { "name": "email" },
                         { "name": "storage" }] },   // ALL known slugs up front; a new slug needs notion-update-data-source BEFORE its first write
    "shipped_at":      { "type": "date" },           // optional, never required (OD3) — valid even when status:shipped
    "owner":           { "type": "rich_text" },
    "source":          { "type": "select", "options": [{ "name": "discovered" }, { "name": "inventoried" }] },
    "depth":           { "type": "select", "options": [{ "name": "stub" }, { "name": "specified" }] },
    "horizon":         { "type": "select", "options": [
                         { "name": "Now" }, { "name": "Next" }, { "name": "Later" }, { "name": "Done" }] },
    "value_hypothesis":{ "type": "rich_text" }
  }
}
```

Apply the same pattern for **Personas** (extras: `persona_type`, `niveau_preuve`) and
**Decisions** (extras: `risk_type` select `value` \| `usability` \| `feasibility` \|
`viability` \| `ethical`, `supersede` rich_text). Common columns are identical across all
three; only the per-type extras differ (see `notion-schema.md §Per-type extra columns`).

If a DB was reused and a column is missing, add it with `notion-update-data-source`.

### Step 4 — create the Roadmap view

```
notion-create-view
  databaseId: <features-db-id>
  name: "Roadmap"
  type: board          // or gallery — grouped by horizon
  groupBy: "horizon"
```

### Step 5 — emit locators

Write `.snap/tmp/remote.json` via the `Write` tool:

```json
{ "notion": {
    "parentPageId":  "<page-id>",
    "briefPageId":   "<page-id>",
    "roadmapViewId": "<view-id>",
    "databases": { "personas": "<db-id>", "features": "<db-id>", "decisions": "<db-id>" }
} }
```

`init-config.mjs --remoteJson .snap/tmp/remote.json` merges this into `snap.config.json`.

---

## 2. Load (snap-loader)

Fetch all rows of the three databases + the Brief page in a single pass. Never re-fetch.

### Fetch database rows

```
notion-fetch  databaseId: <personas-db-id>    // repeat for features, decisions
```

Or use `notion-search` with `parentId = <db-id>` to page through rows when the
database is large (Notion paginates at 100 items). Collect all pages before
normalizing.

### Fetch the Brief page

```
notion-fetch  pageId: <briefPageId>
```

Parse the fenced YAML block at the top → `fm`; the rest → `body`.

### Normalize to entity shape

For each DB row, map columns back to frontmatter:

| Notion column | Entity field |
| --- | --- |
| `snap_id` rich_text | `id` (and `fm.id`) |
| `Name` title | `fm.title` |
| `type` select | `fm.type` |
| `status` select | `fm.status` |
| `stability` select | `fm.stability` |
| `language` select | `fm.language` |
| `created` date | `fm.created` |
| `updated` date | `fm.updated` |
| `parents` rich_text | `fm.links.parents` (split on space) |
| `children` rich_text | `fm.links.children` |
| `related` rich_text | `fm.links.related` |

Read links **from the key-text columns** (`parents`/`children`/`related`), never from
`rel_parents`/`rel_related` — those are display-only projections.

Set `source = { "provider": "notion", "ref": "<page-id>" }`. The page-id is the update
target for F1 (load-modify-write).

If `withBody = false`, omit the body fetch (skip body blocks, keep column fetch).

### Scratch output

```json
// .snap/tmp/state.json
{ "entities": [
    { "id": "FEAT-001", "type": "feature",
      "fm": { … }, "body": "…",
      "source": { "provider": "notion", "ref": "<page-id>" } }
  ],
  "externalIds": ["BRF-001", "PER-001"] }
```

Return a compact digest to the caller — one line per entity, no raw MCP payloads.

---

## 3. Write (snap-writer)

The caller has already decided `op` (`create` or `update`) and, for update, the target
`ref` (page-id from the loader's map). The writer never queries existence.

### Render layer — body markdown → native blocks

Single source of truth = the markdown templates in
`${CLAUDE_PLUGIN_ROOT}/templates/product-model/*.md`. **Notion supports the full
template grammar natively** — nothing is lost in translation: numbered flows stay
numbered, sub-bullets stay nested, whole-line bold survives, and the callout **type
carries meaning** (the whole point). The writer maps each grammar element to its
native block:

| Grammar element (template body) | Notion block | Constraint |
|---|---|---|
| `#` / `##` / `###` | `heading_1` / `heading_2` / `heading_3` | — |
| `---` under every `##` | `divider` | — |
| `> [!TIP]` | `callout` `green_background` + 💡 | colour + icon both PATCH-mutable |
| `> [!IMPORTANT]` | `callout` `blue_background` + 📌 | — |
| `> [!WARNING]` ("À valider") | `callout` `yellow_background` + ⚠️ | — |
| numbered user flow | `numbered_list_item` | nesting via `children` |
| nested alt / error branch | `bulleted_list_item` in the parent's `children` | **2 nesting levels per API call** → follow-up PATCH for deeper |
| tables (AC / NFR / jobs) | `table` + `table_row` | **`table_width` immutable** → delete + recreate on a column change |
| inline `**bold**` / `` `code` `` | `rich_text` annotations | — |
| evidence tags 🟢🟡🔴 | literal emoji in `rich_text.content` | renders inside table cells |
| meta line under H1 | `paragraph`, mixed annotations | id spans use `code:true` |

Callout mapping — **type is the meaning**: `[!TIP]` → `green_background` + 💡 ·
`[!IMPORTANT]` → `blue_background` + 📌 · `[!WARNING]` → `yellow_background` + ⚠️. Both the
colour and the icon are mutable by `PATCH /blocks/{id}`, so a changed callout type is an
in-place edit, not a delete + recreate.

### Create — DB row

```
notion-create-pages
  parentDatabaseId: <db-id>        // NOT parentId — this is a row, not a standalone page
  properties:
    snap_id:    { rich_text: "<FEAT-001>" }
    Name:       { title: "<title>" }
    type:       { select: "feature" }
    status:     { select: "building" }
    stability:  { select: "living" }
    language:   { select: "fr" }
    created:    { date: "2026-06-01" }
    updated:    { date: "2026-06-01" }
    parents:    { rich_text: "BRF-001" }
    children:   { rich_text: "" }
    related:    { rich_text: "PER-001" }
    // per-type extras …
  content: |                       // body blocks
    ## Problem
    …
```

### Create — Brief page

Use `notion-create-pages` with `parentId = <parentPageId>` (standalone page, not a row).
Begin content with the fenced YAML metadata block (see provisioning §Step 3).

### Update — F1 (load-modify-write)

```
// 1. Fetch current state (the loader already did this — use its data, don't re-fetch)
// 2. Rewrite managed properties unconditionally
// 3. Compare bodies — skip body rewrite if unchanged (replacing blocks is heavy)
notion-update-page
  pageId: <ref>           // page-id from the loader map
  properties:
    snap_id:  { rich_text: "<id>" }
    Name:     { title: "<title>" }
    status:   { select: "<new-status>" }
    updated:  { date: "<today>" }
    parents:  { rich_text: "BRF-001" }
    // … all managed props rewritten; user-added columns untouched
  content: "…body blocks…"   // only when body changed vs loaded version
```

Managed properties are always rewritten (idempotent). User-added Notion columns are
never touched (they are unknown to the writer). Body blocks are replaced only when the
rendered body differs from the fetched one — do not clobber hand-edited content
gratuitously.

### Idempotency — the `blockMap` + section-anchor diff

Whole-body replace (above) is the safe fallback, but it thrashes every block on each
write. The precise model mirrors `docMap` with a per-page **block map** so the writer
touches only the slots that actually changed:

```json
// snap.config.json → remote.notion.blockMap[<snap_id>]
{ "pageId": "<page-id>",
  "blocks": { "h2:value": "<blockUUID>", "table:acceptance": "<blockUUID>", "code:yaml": "<blockUUID>" } }
```

Anchor keys derive from the section grammar (`h2:<slug>`, `table:<slug>`, `code:<lang>`,
`callout:<kind>`) — stable across writes, so a slot is recognised even when its content
changes.

1. **Read** — `GET /blocks/{pageId}/children` (paginate 100); recurse into any block
   with `has_children`.
2. **Diff** — compute `fingerprint = hash(type + serialized_content)` for each desired
   block and compare it to the live block resolved by its stored UUID.
3. **Apply** — per logical slot:

   | Condition | Action |
   |---|---|
   | same id, content changed | `PATCH /blocks/{id}` |
   | same id, type changed (`h2`→`h3`) | `DELETE` + insert `after_block` the predecessor |
   | new slot | append to `children`, `position.after_block` the predecessor |
   | removed slot | `DELETE /blocks/{id}` (soft) |
   | fingerprint match | **skip** (no API call — this is what kills the spurious diff) |

- **Tables**: match `table_row`s by index — PATCH / append / delete rows; a column-count
  change recreates the table (`table_width` is immutable).
- **Bottom YAML / meta block**: always PATCH (it carries `updated`); never skip it.
- Persist the updated `blockMap` to `snap.config.json` **atomically, on clean completion
  only** — a partial write must not leave a half-mapped page.

**API limits to respect**: 100 blocks per append, 2 nesting levels per call, `table_width`
and a block's `type` are immutable, and there is **no reorder** primitive — design a stable
section order and use delete + insert for a type change. When the configured MCP server
exposes only whole-body replace (no per-block PATCH), fall back to the F1 body-changed
rule above; the `blockMap` is the optimisation that removes the spurious diff once block
ops are available.

### Manifest (return only this)

```json
{ "id": "FEAT-001", "op": "created", "target": "notion", "ref": "<page-id>" }
```

---

## 4. Idempotence / matching

- `snap_id` rich_text is the Snap join key (D-031). Notion has no native uniqueness
  constraint for it — duplicate rows with the same `snap_id` are possible if the write
  path is called twice without a loader pass.
- Duplicates are caught by `lint --from-json` (`idCount > 1` → exit 1). The lint gate
  blocks the write; Snap does not silently resolve duplicates.
- The **parent** (not the writer) resolves create vs update by matching each entity's
  `fm.id` against `source.ref` from the loader map. If a match exists → update (pass
  `op: update, ref: <page-id>`). If not → create.
- `source.ref` = page-id = the F1 update target. It never changes once created.

---

## 5. Links pass 2 (snap-linker)

After all writers return their `key → page-id` manifests, wire native Relation columns.

```
// For each entity with non-empty parents / related:
notion-update-page
  pageId: <entity-page-id>
  properties:
    rel_parents: { relation: [{ "id": "<parent-page-id>" }, …] }
    rel_related: { relation: [{ "id": "<related-page-id>" }, …] }
```

- Resolve each Snap id to a page-id via the collected manifest map. Skip and report
  any id absent from the map.
- Leave `parents` / `children` / `related` key-text columns untouched — they are the
  canonical source the loader reads. `rel_*` are display-only.
- Idempotent: setting the same relation ids again is a safe no-op.
- `children` links are not projected to a native relation (the parent already holds
  `rel_parents` pointing back); this avoids circular schema dependencies.

---

## 6. Caveats

- **Select options must exist at create time.** Notion rejects a select value that
  isn't in the option list. Declare all enum options during provisioning (step 2).
  Adding a missing option later: `notion-update-data-source` on the database.
- **Pagination.** Large databases return 100 rows per page. Use the cursor from the
  response to loop with `notion-search` until `has_more = false`.
- **Relations need both pages to exist.** This is why link wiring is pass 2 — all
  pages must be created before relations can reference them.
- **The Brief is a page, not a row.** `notion-create-pages` uses `parentId` (a plain
  page or workspace). DB rows use `parentDatabaseId`. Do not mix them up.
- **Body replacement is destructive.** Notion replaces the full block list on update.
  Only rewrite when the rendered body differs from the fetched one (F1 rule).
